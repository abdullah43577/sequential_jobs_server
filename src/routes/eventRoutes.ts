import { Router } from "express";
import { validateAccessToken, validateCompanySession } from "../middleware/validateToken";
import { getEmployerEvents } from "../controllers/events.controller";

const eventsRouter = Router();

eventsRouter.get("/company_events", validateAccessToken, validateCompanySession, getEmployerEvents);

export { eventsRouter };
