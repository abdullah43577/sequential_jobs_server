import { Router } from "express";
import { validateAccessToken, validateAdminSession } from "../../middleware/validateToken";
import { createPrivateChat, getChatHistory, getUserRooms } from "../../controllers/chat/chat.controller";

const chatRouter = Router();

chatRouter.post("/create", validateAccessToken, validateAdminSession, createPrivateChat);
chatRouter.get("/rooms", validateAccessToken, validateAdminSession, getUserRooms);
chatRouter.get("/history", validateAccessToken, validateAdminSession, getChatHistory);

export { chatRouter };
