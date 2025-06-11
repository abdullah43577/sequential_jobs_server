import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";
import User from "../../models/users.model";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";

const sendBroadcast = async function (req: IUserRequest, res: Response) {
  try {
    const { userId: adminId } = req;
    const { title, message, userId } = req.body;
    if (!userId) return res.status(400).json({ message: "User ID is required!" });

    if (!title || !message) return res.status(400).json({ message: "Broadcast title and body must be present!" });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "Invalid User ID" });

    await createAndSendNotification({ recipient: userId, sender: adminId as string, type: NotificationType.MESSAGE, title, message, status: NotificationStatus.UNREAD });

    res.status(200).json({ message: "Broadcast sent" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { sendBroadcast };
