import { Schema, Types, model } from "mongoose";

export interface IBroadcast {
  title: string;
  content: string;
  sender: Types.ObjectId;
  targetGroups: { jobSeekers: boolean; employers: boolean; specific: Types.ObjectId[] };
  deliveredTo: { user: Types.ObjectId; deliveredAt: Date }[];
  readBy: { user: Types.ObjectId; readAt: Date }[];
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetGroups: {
      jobSeekers: {
        type: Boolean,
        default: false,
      },
      employers: {
        type: Boolean,
        default: false,
      },
      specific: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
    },
    deliveredTo: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

export const Broadcast = model("Broadcast", BroadcastSchema);
