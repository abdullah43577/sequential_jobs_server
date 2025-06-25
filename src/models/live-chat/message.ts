import { model, Schema, Types } from "mongoose";

interface IMessage {
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  senderType: "user" | "admin";
  message: string;
  seen: boolean;
  sentAt: Date;
  isFromAI: boolean;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderType: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    message: {
      type: String,
      required: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    isFromAI: {
      type: Boolean,
      default: false, // Set true if message is from AI
    },
  },
  { timestamps: true }
);

const Message = model<IMessage>("Message", messageSchema);

export default Message;
