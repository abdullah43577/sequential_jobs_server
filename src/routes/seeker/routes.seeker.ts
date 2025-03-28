import { Router } from "express";
import { validateAccessToken, validateSeekerSession } from "../../middleware/validateToken";
import { applyForJob, getAllJobs, getAllJobTests, getApplicationTest, getJobDetails, submitApplicationTest, uploadResume } from "../../controllers/seeker.controller";
import { upload } from "../../utils/multerConfig";

const seekerRouter = Router();

//* jobs
seekerRouter.get("/get-jobs", validateAccessToken, validateSeekerSession, getAllJobs);
seekerRouter.get("/get-job/:job_id", validateAccessToken, validateSeekerSession, getJobDetails);
seekerRouter.post("/job-apply", validateAccessToken, validateSeekerSession, applyForJob);
seekerRouter.get("/employer_application_test/:job_id", validateAccessToken, getApplicationTest);
seekerRouter.post("/submit_application_test", validateAccessToken, validateSeekerSession, submitApplicationTest);

//* resume management
seekerRouter.put("/profile/update", upload.single("resume"), validateAccessToken, uploadResume);

//* test management
seekerRouter.get("/get_job_tests", validateAccessToken, getAllJobTests);

export { seekerRouter };
