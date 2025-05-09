import { Schema, Types, model } from "mongoose";

export interface IMessage {
  room: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  readBy: { user: Types.ObjectId; readAt: Date }[];
}

const MessageSchema = new Schema<IMessage>(
  {
    room: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    readBy: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient queries
MessageSchema.index({ room: 1, createdAt: -1 });

export const Message = model("Message", MessageSchema);
