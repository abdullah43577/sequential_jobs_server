import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt, { Secret } from "jsonwebtoken";
import { CustomJwtPayload } from "../interface";
import { Room } from "../models/broadcasts/room.model";
import { Message } from "../models/broadcasts/message.model";
// import { createBroadcastRoom } from "../utils/chatHelper";
import { Types } from "mongoose";
import { Broadcast } from "../models/broadcasts/broadcast.model";
import User from "../models/users.model";
const { ACCESS_TOKEN_SECRET } = process.env;

let io: Server;

export const initializeSocket = function (server: HttpServer) {
  io = new Server(server, {
    cors: {
      // origin: "*", // Configure according to your security requirements
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", async socket => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("No token provided");
      socket.disconnect();
      return;
    }

    let userId: string = "";
    let userRole: string = "";

    try {
      const { id, role } = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret) as CustomJwtPayload;
      userId = id;
      userRole = role;

      // Join user to their individual room (using their ID)
      socket.join(id);

      console.log(`User ${id} (${role}) connected to their room`);

      // Find all rooms where the user is a participant and join them
      const userRooms = await Room.find({ participants: id });
      userRooms.forEach(room => {
        socket.join(room._id.toString());
        console.log(`User ${id} joined room ${room._id}`);
      });
    } catch (error) {
      console.log("Invalid token");
      socket.disconnect();
      return;
    }

    // Handle sending messages
    socket.on("send_message", async (data: { roomId: Types.ObjectId | string; content: string }) => {
      try {
        const { roomId, content } = data;

        // Validate user is part of the room
        const room = await Room.findById(roomId);
        if (!room || !room.participants.some(p => p.toString() === userId)) {
          socket.emit("error", { message: "Not authorized to send messages to this room" });
          return;
        }

        // Create new message
        const message = new Message({
          room: roomId,
          sender: userId,
          content,
        });
        await message.save();

        // Populate sender info before emitting
        const populatedMessage = await Message.findById(message._id).populate<{ sender: { _id: string; first_name: string; last_name: string; email: string; role: string } }>("sender", "first_name last_name email role").lean();

        // Emit to the room
        io.to(roomId.toString()).emit("new_message", populatedMessage);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle joining a room
    socket.on("join_room", async (data: { roomId: Types.ObjectId | string }) => {
      try {
        const { roomId } = data;

        // Validate user is part of the room
        const room = await Room.findById(roomId);
        if (!room || !room.participants.some(p => p.toString() === userId)) {
          socket.emit("error", { message: "Not authorized to join this room" });
          return;
        }

        socket.join(roomId.toString());
        socket.emit("room_joined", { roomId });

        // Mark messages as read
        await markMessagesAsRead(roomId.toString(), userId);
      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // Handle broadcast message (admin only)
    socket.on("send_broadcast", async (data: { title: string; content: string; targetJobSeekers: boolean; targetEmployers: boolean; specificUsers: string[] }) => {
      try {
        // Check if user is admin
        if (userRole !== "admin" && userRole !== "super-admin") {
          socket.emit("error", { message: "Only admins can send broadcast messages" });
          return;
        }

        const { title, content, targetJobSeekers, targetEmployers, specificUsers } = data;

        // Create broadcast record
        const broadcast = await createBroadcast(userId, title, content, targetJobSeekers, targetEmployers, specificUsers);

        socket.emit("broadcast_sent", { broadcastId: broadcast._id });
      } catch (error) {
        console.error("Error sending broadcast:", error);
        socket.emit("error", { message: "Failed to send broadcast" });
      }
    });

    // Handle leave room
    socket.on("leave_room", (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(roomId);
      socket.emit("room_left", { roomId });
    });

    // Handle typing indicators
    socket.on("typing", (data: { roomId: string; isTyping: boolean }) => {
      const { roomId, isTyping } = data;
      socket.to(roomId).emit("user_typing", { userId, isTyping });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
};

// Mark messages as read
async function markMessagesAsRead(roomId: string, userId: string) {
  await Message.updateMany(
    {
      room: roomId,
      sender: { $ne: userId },
      "readBy.user": { $ne: userId },
    },
    {
      $push: { readBy: { user: userId, readAt: new Date() } },
    }
  );
}

// Create broadcast and notify users
async function createBroadcast(adminId: string, title: string, content: string, targetJobSeekers: boolean, targetEmployers: boolean, specificUsers: string[] = []) {
  // Import here to avoid circular dependency
  // const { Broadcast } = require("../models/Broadcast");
  // const { User } = require("../models/User");

  // Create broadcast record
  const broadcast = await Broadcast.create({
    title,
    content,
    sender: adminId,
    targetGroups: {
      jobSeekers: targetJobSeekers,
      employers: targetEmployers,
      specific: specificUsers.map(id => new Types.ObjectId(id)),
    },
  });

  // Find target users
  let targetUserIds: string[] = [];

  if (targetJobSeekers) {
    const jobSeekers = await User.find({ role: "job-seeker" }).select("_id");
    targetUserIds = [...targetUserIds, ...jobSeekers.map(u => u._id.toString())];
  }

  if (targetEmployers) {
    const employers = await User.find({ role: "company" }).select("_id");
    targetUserIds = [...targetUserIds, ...employers.map(u => u._id.toString())];
  }

  if (specificUsers.length > 0) {
    targetUserIds = [...targetUserIds, ...specificUsers];
  }

  // Remove duplicates
  targetUserIds = [...new Set(targetUserIds)];

  // Create a room for this broadcast
  const room = await Room.create({
    name: `broadcast_${adminId}_${Date.now()}`,
    type: "broadcast",
    participants: [adminId, ...targetUserIds],
    admin: adminId,
  });

  // Create the first message in the room
  const message = await Message.create({
    room: room._id,
    sender: adminId,
    content,
  });

  // Mark as delivered to all target users
  const deliveryUpdates = targetUserIds.map(userId => ({
    user: userId,
    deliveredAt: new Date(),
  }));

  await Broadcast.findByIdAndUpdate(broadcast._id, {
    $push: { deliveredTo: { $each: deliveryUpdates } },
  });

  // Notify each user
  for (const userId of targetUserIds) {
    // new_broadcast
    io.to(userId).emit("notification", {
      broadcastId: broadcast._id,
      title,
      content,
      sender: adminId,
      roomId: room._id,
    });
  }

  return broadcast;
}

export const getSocketIO = function () {
  if (!io) throw new Error("Socket.io not initialized");

  return io;
};
