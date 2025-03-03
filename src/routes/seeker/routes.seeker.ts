import { Router } from "express";
import { validateAccessToken, validateSeekerSession } from "../../middleware/validateToken";
import { applyForJob, getAllJobs, getJobDetails, submitApplicationTest } from "../../controllers/employer/seeker.controller";

const seekerRouter = Router();

seekerRouter.get("/get-jobs", validateAccessToken, validateSeekerSession, getAllJobs);
seekerRouter.get("/get-job/:job_id", validateAccessToken, validateSeekerSession, getJobDetails);
seekerRouter.post("/job-apply/:job_id", validateAccessToken, validateSeekerSession, applyForJob);
seekerRouter.post("/job-apply/application_test", validateAccessToken, validateSeekerSession, submitApplicationTest);

export { seekerRouter };
