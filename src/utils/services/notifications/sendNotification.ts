import { Types } from "mongoose";
import { getSocketIO } from "../../../helper/socket";
import Notification from "../../../models/notifications.model";

interface CreateNotificationData {
  recipient: Types.ObjectId;
  sender: string;
  title: string;
  message: string;
  type: string;
  status: string;
}

export const createAndSendNotification = async function (data: CreateNotificationData) {
  const notification = await Notification.create({
    recipient: data.recipient,
    sender: data.sender,
    type: data.type,
    title: data.title,
    message: data.message,
    status: data.status,
  });

  await sendNotification({
    id: notification._id as any,
    recipient_id: data.recipient,
    title: data.title,
    message: data.message,
    status: data.status,
    type: data.type,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  });

  return notification;
};

interface NotificationData {
  id: Types.ObjectId;
  recipient_id: Types.ObjectId;
  title: string;
  message: string;
  status: string;
  type: string;
  readAt: Date | undefined;
  createdAt: Date | undefined;
}

const sendNotification = async function ({ id, recipient_id, title, message, status, type, readAt, createdAt }: NotificationData) {
  const io = getSocketIO();

  io.to(recipient_id.toString()).emit("notification", {
    _id: id,
    title,
    message,
    status,
    type,
    readAt,
    createdAt,
  });
};
