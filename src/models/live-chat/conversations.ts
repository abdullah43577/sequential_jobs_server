import { model, Schema, Types } from "mongoose";

interface IConversation {
  participants: Types.ObjectId[];
  isResolved: boolean;
  initiatedBy: Types.ObjectId;
  lastMessage: string;
  lastUpdated: Date;
  status: "waiting" | "active" | "resolved" | "closed";
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User", // could be Customer and SupportAgent
        required: true,
      },
    ],
    isResolved: {
      type: Boolean,
      default: false,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: String,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["waiting", "active", "resolved", "closed"],
      default: "waiting",
    },
  },
  { timestamps: true }
);

const Conversation = model<IConversation>("Conversation", conversationSchema);

export default Conversation;
