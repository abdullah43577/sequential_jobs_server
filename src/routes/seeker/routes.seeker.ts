import { Router } from "express";
import { validateAccessToken, validateSeekerSession } from "../../middleware/validateToken";
import { applyForJob, getAllJobs, getAllJobTests, getApplicationTest, getJobDetails, submitApplicationTest, submitJobTest, uploadResume } from "../../controllers/seeker.controller";
import { upload } from "../../utils/multerConfig";

const seekerRouter = Router();

//* JOBS
seekerRouter.get("/get-jobs", validateAccessToken, validateSeekerSession, getAllJobs);
seekerRouter.get("/get-job/:job_id", validateAccessToken, validateSeekerSession, getJobDetails);
seekerRouter.post("/job-apply", validateAccessToken, validateSeekerSession, applyForJob);
seekerRouter.get("/employer_application_test/:job_id", validateAccessToken, getApplicationTest);
seekerRouter.post("/submit_application_test", validateAccessToken, validateSeekerSession, submitApplicationTest);

//* RESUME MANAGEMENT
seekerRouter.put("/profile/update", upload.single("resume"), validateAccessToken, validateSeekerSession, uploadResume);

//* TEST MANAGEMENT
seekerRouter.get("/get_job_tests", validateAccessToken, validateSeekerSession, getAllJobTests);
seekerRouter.post("/submit_job_test", validateAccessToken, validateSeekerSession, submitJobTest);

export { seekerRouter };
