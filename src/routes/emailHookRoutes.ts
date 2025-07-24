import { Router } from "express";
import { EmailActivityHookEvent } from "../controllers/emails_hook.controller";

const emailWebhook = Router();

emailWebhook.post("/webhook", EmailActivityHookEvent);

export { emailWebhook };

//
