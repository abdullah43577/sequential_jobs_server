import { Router } from "express";
import { validateAccessToken, validateSeekerSession } from "../../middleware/validateToken";
import { applyForJob, getAllJobs, getApplicationTest, getJobDetails, submitApplicationTest } from "../../controllers/seeker.controller";

const seekerRouter = Router();

seekerRouter.get("/get-jobs", validateAccessToken, validateSeekerSession, getAllJobs);
seekerRouter.get("/get-job/:job_id", validateAccessToken, validateSeekerSession, getJobDetails);
seekerRouter.post("/job-apply", validateAccessToken, validateSeekerSession, applyForJob);
seekerRouter.get("/employer_application_test/:job_id", validateAccessToken, getApplicationTest);
seekerRouter.post("/submit_application_test", validateAccessToken, validateSeekerSession, submitApplicationTest);

export { seekerRouter };
