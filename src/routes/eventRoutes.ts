import { Router } from "express";
import { validateAccessToken, validateCompanySession, validateSeekerSession } from "../middleware/validateToken";
import { getEmployerEvents, getSeekerEvents } from "../controllers/events.controller";

const eventsRouter = Router();

eventsRouter.get("/company_events", validateAccessToken, validateCompanySession, getEmployerEvents);
eventsRouter.get("/seeker_events", validateAccessToken, validateSeekerSession, getSeekerEvents);

export { eventsRouter };

//* test
