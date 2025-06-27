import { Router } from "express";
import { validateAccessToken, validateAdminSession } from "../middleware/validateToken";
import { createTicket, getAllTicket, getUserTicket, updateTicket } from "../controllers/ticket.controller";
import { upload } from "../utils/multerConfig";
import { getChatRooms } from "../controllers/livechat.controller";

const ticketRouter = Router();

ticketRouter.post("/create", validateAccessToken, upload.array("attachments"), createTicket);
ticketRouter.get("/my-tickets", validateAccessToken, getUserTicket);

//* ADMIN ROUTER
ticketRouter.get("/get-tickets", validateAccessToken, validateAdminSession, getAllTicket);
ticketRouter.put("/update", validateAccessToken, validateAdminSession, updateTicket);
ticketRouter.get("/chat-rooms", validateAccessToken, validateAdminSession, getChatRooms);

export { ticketRouter };
