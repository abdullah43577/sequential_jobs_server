import { Schema, model, Types, Model } from "mongoose";
import { INotification } from "../utils/types/modelTypes";

// Enum for notification types
export enum NotificationType {
  INFO = "info",
  WARNING = "warning",
  IMPORTANT = "important",
  SUCCESS = "success",
  ERROR = "error",
  APPLICATION_STATUS = "application_status",
  MESSAGE = "message",
  INTERVIEW = "interview",
}

// Enum for notification status
export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
    },
    title: {
      type: String,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
    },

    isSystemGenerated: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Add an index to improve query performance
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.status = NotificationStatus.READ;
  this.readAt = new Date();
  return this.save();
};

const Notification = model<INotification>("Notification", notificationSchema);

export default Notification;
