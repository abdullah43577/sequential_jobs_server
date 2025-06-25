import { Types } from "mongoose";

// types/socket.ts
export interface SocketUser {
  id: string;
  role: "user" | "admin";
}

// Message payload interfaces
export interface SendMessagePayload {
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  senderType: "user" | "admin";
  message: string;
  sentAt?: string; // ISO string, server can override
}

export interface MessageResponse {
  messageId: Types.ObjectId;
  conversationId: Types.ObjectId;
  sender: Types.ObjectId;
  senderType: "user" | "admin";
  message: string;
  sentAt: string;
  isFromAI: boolean;
}

// Chat initiation interfaces
export interface InitiateChatPayload {
  initialMessage?: string;
}

export interface ChatInitiatedResponse {
  conversationId: Types.ObjectId;
  status: "waiting" | "active" | "resolved";
  estimatedWaitTime?: number;
}

// Other payload interfaces
export interface AcceptChatPayload {
  conversationId: string;
}

export interface MarkSeenPayload {
  messageId: string;
  conversationId: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface ResolveChatPayload {
  conversationId: string;
  reason?: string;
}

// Event response interfaces
export interface AgentJoinedResponse {
  agentId: string;
  agentName?: string;
  message: string;
}

export interface NewChatRequestResponse {
  userId: Types.ObjectId;
  userName: string;
  userRole: string;
  message: string;
  avatar: string | null;
  conversationId: Types.ObjectId;
  priority: "high" | "medium" | "normal";
}

export interface TypingResponse {
  userId: string;
  isTyping: boolean;
  userName?: string;
}

export interface MessageSeenResponse {
  messageId: string;
  seenBy: string;
  seenAt: string;
}

export interface ChatResolvedResponse {
  conversationId: string;
  resolvedBy: string;
  resolvedAt: string;
  reason?: string;
}

// Error response interface
export interface SocketErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// Database model interfaces (matching your actual schema)
export interface ConversationDocument {
  _id: Types.ObjectId;
  participants: Types.ObjectId[]; // Array of user IDs (customer + support agent)
  initiatedBy: Types.ObjectId;
  lastMessage: string;
  status: "waiting" | "active" | "resolved" | "closed";
  isResolved: boolean;
  createdAt?: Date;
  lastUpdated: Date;
}

export interface MessageDocument {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  senderId?: string;
  senderType?: "user" | "admin";
  message: string;
  isFromAI: boolean;
  seen: boolean;
  seenAt?: Date;
  sentAt: Date;
}

// Socket event map for type safety
export interface ServerToClientEvents {
  "chat-initiated": (data: ChatInitiatedResponse) => void;
  "agent-joined": (data: AgentJoinedResponse) => void;
  "new-message": (data: MessageResponse) => void;
  "message-seen": (data: MessageSeenResponse) => void;
  "user-typing": (data: TypingResponse) => void;
  "chat-resolved": (data: ChatResolvedResponse) => void;
  "new-chat-request": (data: NewChatRequestResponse) => void;
  "chat-accepted": (data: { conversationId: string; agentId: string }) => void;
  "chat-error": (data: SocketErrorResponse) => void;
  "message-error": (data: SocketErrorResponse) => void;
  notification: (data: any) => void;
  "support-notification": (data: any) => void;
}

export interface ClientToServerEvents {
  "initiate-chat": (data: InitiateChatPayload) => void;
  "accept-chat": (data: AcceptChatPayload) => void;
  "send-message": (data: SendMessagePayload) => void;
  "mark-seen": (data: MarkSeenPayload) => void;
  "typing-start": (data: TypingPayload) => void;
  "typing-stop": (data: TypingPayload) => void;
  "resolve-chat": (data: ResolveChatPayload) => void;
}

export interface InterServerEvents {
  // Add any server-to-server events if needed
}

export interface SocketData {
  userId: string;
  userRole: "job-seeker" | "company" | "panelist" | "medical-expert" | "admin" | "super-admin";
}
