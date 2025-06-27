// socket.ts
import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt, { Secret } from "jsonwebtoken";
import { CustomJwtPayload } from "../interface";
import Conversation from "../models/live-chat/conversations";
import Message from "../models/live-chat/message";
import { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData, InitiateChatPayload, ConversationDocument, MessageDocument } from "./socketHelper";
import { Types } from "mongoose";
import User from "../models/users.model";

const { ACCESS_TOKEN_SECRET } = process.env;

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

let io: TypedServer;

export const initializeSocket = function (server: HttpServer): TypedServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server);

  io.on("connection", async (socket: TypedSocket) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("No token provided");
      socket.disconnect();
      return;
    }

    try {
      const { id, role } = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret) as CustomJwtPayload;

      // Store user data in socket
      socket.data.userId = id;
      socket.data.userRole = role;

      // ALL USERS JOIN THEIR DEFAULT ROOMS FOR NOTIFICATIONS
      socket.join(id);

      // SUPPORT AGENTS JOIN POOL TO KNOW THOSE WHO ARE AVAILABLE
      if (role === "admin" || role === "super-admin") {
        socket.join("support-pool");
        console.log(`Support agent ${id} joined support pool`);
      }

      console.log(`User ${id} (${role}) connected to their room`);

      // Join existing active conversations
      await joinExistingConversations(socket, id);
    } catch (error) {
      console.log("Invalid token");
      socket.disconnect();
      return;
    }

    //* ==================== CHAT INITIATION BY USER =====================================
    socket.on("initiate-chat", async data => {
      try {
        if (socket.data.userRole !== "job-seeker" && socket.data.userRole !== "company") {
          socket.emit("chat-error", { message: "Only job seekers or admin can initiate chats" });
          return;
        }

        const conversation = await initiateChat(socket.data.userId as unknown as Types.ObjectId, data);
        socket.join(`conversation-${conversation._id}`);

        const user = await User.findById(socket.data.userId);
        if (!user) return socket.emit("chat-error", { message: "User not found!" });

        const payload = {
          conversationId: conversation._id,
          userId: user._id,
          userName: `${user.first_name} ${user.last_name}`,
          userRole: user.role,
          message: data.initialMessage || "New chat initiated",
          avatar: user.profile_pic,
          priority: user.role === "admin" ? "high" : "normal",
          lastMessageTime: conversation.createdAt,
        };

        // NOTIFY SUPPORT POOL ABOUT NEW CHAT
        socket.to("support-pool").emit("new-chat-request", payload as any);

        socket.emit("chat-initiated", {
          conversationId: conversation._id,
          status: "waiting",
        });
      } catch (error) {
        socket.emit("chat-error", { message: "Failed to initiate chat" });
      }
    });

    //* ==================== SUPPORT AGENT ACCEPTING CHAT (ADMIN) =====================================
    socket.on("accept-chat", async data => {
      try {
        if (socket.data.userRole !== "admin" && socket.data.userRole !== "super-admin") {
          socket.emit("chat-error", { message: "Only support agents can accept chats" });
          return;
        }

        await acceptChat(data.conversationId, socket.data.userId);
        socket.join(`conversation-${data.conversationId}`);

        const user = await User.findById(socket.data.userId);
        if (!user) return socket.emit("chat-error", { message: "User not found!" });

        // Notify customer that agent joined
        socket.to(`conversation-${data.conversationId}`).emit("agent-joined", {
          agentId: socket.data.userId,
          message: `${user?.first_name}, your support agent has joined the chat`,
        });

        // Remove from support pool notifications
        socket.to("support-pool").emit("chat-accepted", {
          conversationId: data.conversationId,
          agentId: socket.data.userId,
        });
      } catch (error) {
        socket.emit("chat-error", { message: "Failed to accept chat" });
      }
    });

    //* ==================== SENDING MESSAGES =====================================
    socket.on("send-message", async data => {
      try {
        // Validate that senderId matches authenticated user
        if (data.sender.toString() !== socket.data.userId) {
          socket.emit("message-error", { message: "Sender ID mismatch" });
          return;
        }

        // Validate senderType matches user role
        if (data.senderType !== socket.data.userRole) {
          socket.emit("message-error", { message: "Sender type mismatch" });
          return;
        }

        const messageData = {
          conversation: data.conversationId,
          sender: data.sender,
          senderType: data.senderType,
          message: data.message,
          isFromAI: false,
          sentAt: new Date(), // Server always sets the timestamp
        };

        const newMessage = await createMessage(messageData);

        // Update conversation's last message
        await updateLastMessage(data.conversationId, data.message);

        // Emit to all participants in the conversation
        io.to(`conversation-${data.conversationId}`).emit("new-message", {
          messageId: newMessage._id,
          conversationId: data.conversationId,
          sender: data.sender,
          senderType: data.senderType,
          message: data.message,
          sentAt: newMessage.sentAt.toISOString(),
          isFromAI: false,
        });
      } catch (error) {
        socket.emit("message-error", { message: "Failed to send message" });
      }
    });

    //* ==================== MARK MESSAGES AS SEEN =====================================
    socket.on("mark-seen", async data => {
      try {
        await markMessageAsSeen(data.messageId, socket.data.userId);

        socket.to(`conversation-${data.conversationId}`).emit("message-seen", {
          messageId: data.messageId,
          seenBy: socket.data.userId,
          seenAt: new Date().toISOString(),
        });
      } catch (error) {
        console.log("Failed to mark message as seen");
      }
    });

    //* ==================== TYPING INDICATORS =====================================
    socket.on("typing-start", data => {
      socket.to(`conversation-${data.conversationId}`).emit("user-typing", {
        userId: socket.data.userId,
        isTyping: true,
      });
    });

    socket.on("typing-stop", data => {
      socket.to(`conversation-${data.conversationId}`).emit("user-typing", {
        userId: socket.data.userId,
        isTyping: false,
      });
    });

    //* ==================== RESOLVING CHAT =====================================
    socket.on("resolve-chat", async data => {
      try {
        if (socket.data.userRole !== "admin" && socket.data.userRole !== "super-admin") {
          socket.emit("chat-error", { message: "Only support agents can resolve chats" });
          return;
        }

        await resolveConversation(data.conversationId);

        io.to(`conversation-${data.conversationId}`).emit("chat-resolved", {
          conversationId: data.conversationId,
          resolvedBy: socket.data.userId,
          resolvedAt: new Date().toISOString(),
          reason: data.reason,
        });

        // Leave the conversation room
        socket.leave(`conversation-${data.conversationId}`);
      } catch (error) {
        socket.emit("chat-error", { message: "Failed to resolve chat" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.data.userId} disconnected`);
    });
  });

  return io;
};

// Helper functions
async function joinExistingConversations(socket: TypedSocket, userId: string): Promise<void> {
  try {
    // Find conversations where user is a participant
    const activeConversations = await Conversation.find({
      participants: userId,
      isResolved: false,
    });

    for (const conversation of activeConversations) {
      socket.join(`conversation-${conversation._id}`);
    }
  } catch (error) {
    console.log("Failed to join existing conversations");
  }
}

async function initiateChat(userId: Types.ObjectId, data: InitiateChatPayload): Promise<ConversationDocument> {
  try {
    const conversation = new Conversation({
      participants: [userId], // Start with just the customer
      initiatedBy: userId,
      lastMessage: data.initialMessage || "Chat initiated",
      status: "waiting",
      isResolved: false,
    });

    await conversation.save();

    // Create initial message if provided
    if (data.initialMessage) {
      await createMessage({
        conversation: conversation._id,
        sender: userId,
        senderType: data.senderType,
        message: data.initialMessage,
        // messageType: "text",
        isFromAI: false,
      });
    }

    return conversation;
  } catch (error) {
    throw error;
  }
}

async function acceptChat(conversationId: string, agentId: string): Promise<void> {
  await Conversation.findByIdAndUpdate(conversationId, {
    $addToSet: { participants: agentId }, // Add agent to participants array
    status: "active",
    lastUpdated: new Date(),
  });
}

async function createMessage(messageData: { conversation: Types.ObjectId; sender: Types.ObjectId; senderType: "job-seeker" | "company" | "admin" | "super-admin"; message: string; isFromAI: boolean }): Promise<MessageDocument> {
  try {
    const message = new Message({
      ...messageData,
      sentAt: new Date(),
      seen: false,
    });
    await message.save();
    return message;
  } catch (error) {
    throw error;
  }
}

async function updateLastMessage(conversationId: Types.ObjectId, lastMessage: string): Promise<void> {
  try {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage,
      lastUpdated: new Date(),
    });
  } catch (error) {
    throw error;
  }
}

async function markMessageAsSeen(messageId: string, userId: string): Promise<void> {
  try {
    await Message.findByIdAndUpdate(messageId, {
      seen: true,
      seenAt: new Date(),
    });
  } catch (error) {
    throw error;
  }
}

async function resolveConversation(conversationId: string): Promise<void> {
  try {
    await Conversation.findByIdAndUpdate(conversationId, {
      isResolved: true,
      status: "resolved",
      lastUpdated: new Date(),
    });
  } catch (error) {
    throw error;
  }
}

// Utility functions
export const getSocketIO = function (): TypedServer {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};

export const notifyUser = function (userId: string, notification: any): void {
  if (io) {
    io.to(userId).emit("notification", notification);
  }
};

export const notifySupportPool = function (data: any): void {
  if (io) {
    io.to("support-pool").emit("support-notification", data);
  }
};
