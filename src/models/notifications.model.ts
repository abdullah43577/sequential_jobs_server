import { Schema, model, Types, Model } from "mongoose";
import { INotification } from "../utils/types/modelTypes";
import { Document } from "mongoose";

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

//* for methods
export interface INotificationDocument extends INotification, Document {
  markAsRead(): Promise<INotificationDocument>;
  deleteNotification(): Promise<void>;
}

//* for statics
export interface INotificationModel extends Model<INotificationDocument> {
  markAllAsRead(userId: Types.ObjectId | string): Promise<number>;
  deleteAllNotifications(user: Types.ObjectId | string): Promise<number>;
}

const notificationSchema = new Schema<INotificationDocument, INotificationModel>(
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

notificationSchema.statics.markAllAsRead = async function (userId: Types.ObjectId | string) {
  const result = await this.updateMany(
    {
      recipient: userId,
      status: NotificationStatus.UNREAD,
    },
    {
      $set: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

notificationSchema.methods.deleteNotification = async function () {
  return this.deleteOne();
};

notificationSchema.statics.deleteAllNotifications = async function (userId: Types.ObjectId | string) {
  const result = await this.deleteMany({ recipient: userId });
  return result.deletedCount;
};

const Notification = model<INotificationDocument, INotificationModel>("Notification", notificationSchema);

export default Notification;
