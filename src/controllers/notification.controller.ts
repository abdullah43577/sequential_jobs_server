import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import Notification from "../models/notifications.model";

const getNotifications = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const notifications = await Notification.find({ recipient: userId }).lean();
    if (!notifications) return res.status(200).json([]);

    return res.status(200).json(notifications);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const markAllNotificationsRead = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const updatedCount = await Notification.markAllAsRead(userId as string);

    return res.status(200).json({
      message: "All notifications marked as read.",
      count: updatedCount,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const deleteNotification = async function (req: IUserRequest, res: Response) {
  try {
    const id = req.params;
    const notification = await Notification.findById(id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    await notification.deleteNotification();

    res.status(200).json({ message: "Notification deleted successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const deleteAllNotifications = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getNotifications, markAllNotificationsRead, deleteNotification, deleteAllNotifications };
