import { Router } from "express";
import { getCompanyJobs, getLandingJobs } from "../controllers/landing.controller";

const landingRouter = Router();

landingRouter.get("/landing_jobs", getLandingJobs);
landingRouter.get("/company_jobs", getCompanyJobs);

export { landingRouter };
