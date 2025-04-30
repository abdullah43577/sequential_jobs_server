import { Router } from "express";
import { getCompanyJobs, getLandingJobById, getLandingJobs } from "../controllers/landing.controller";

const landingRouter = Router();

landingRouter.get("/landing_jobs", getLandingJobs);
landingRouter.get("/landing_jobs/job_detail", getLandingJobById);
landingRouter.get("/company_jobs/:username", getCompanyJobs);

export { landingRouter };
