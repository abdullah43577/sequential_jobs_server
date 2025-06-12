import { Router } from "express";
import { validateAccessToken } from "../middleware/validateToken";
import { deleteAllNotifications, deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "../controllers/notification.controller";

const notificationRouter = Router();

notificationRouter.get("/get_notifications", validateAccessToken, getNotifications);
notificationRouter.put("/mark_as_read/:id", validateAccessToken, markNotificationRead);
notificationRouter.put("/mark_all_as_read", validateAccessToken, markAllNotificationsRead);
notificationRouter.delete("/delete_notification/:id", validateAccessToken, deleteNotification);
notificationRouter.delete("/delete_all_notifications", validateAccessToken, deleteAllNotifications);

export { notificationRouter };
