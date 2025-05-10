import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import Notification, { NotificationStatus, NotificationType } from "../../models/notifications.model";
import User from "../../models/users.model";
import { getSocketIO } from "../../helper/socket";

const sendBroadcast = async function (req: IUserRequest, res: Response) {
  try {
    const { userId: adminId } = req;
    const { title, message, userId } = req.body;
    if (!userId) return res.status(400).json({ message: "User ID is required!" });

    if (!title || !message) return res.status(400).json({ message: "Broadcast title and body must be present!" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "Invalid User ID" });

    const notification = await Notification.create({
      recipient: userId,
      sender: adminId,
      type: NotificationType.MESSAGE,
      title,
      message,
      status: NotificationStatus.UNREAD,
    });

    const io = getSocketIO();

    io.to(userId.toString()).emit("notification", {
      id: notification._id,
      title,
      message,
      type: NotificationType.MESSAGE,
      status: NotificationStatus.UNREAD,
      createdAt: notification.createdAt,
    });

    res.status(200).json({ message: "Broadcast sent" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { sendBroadcast };
