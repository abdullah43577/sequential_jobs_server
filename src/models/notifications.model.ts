import { Schema, model } from "mongoose";
import { INotification } from "../utils/types/modelTypes";

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["info", "warning", "important"], required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = model<INotification>("Notification", notificationSchema);

export default Notification;
