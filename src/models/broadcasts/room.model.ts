import { Types } from "mongoose";
import { Schema, model } from "mongoose";

export interface RoomInterface {
  name: string;
  type: "private" | "broadcast" | "group";
  participants: Types.ObjectId[];
  admin: Types.ObjectId;
}

const RoomSchema = new Schema<RoomInterface>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["private", "broadcast", "group"],
      default: "private",
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Room = model("Room", RoomSchema);
