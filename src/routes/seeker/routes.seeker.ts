import { Router } from "express";
import { validateAccessToken, validateCompanySession, validateSeekerSession } from "../../middleware/validateToken";
import { upload } from "../../utils/multerConfig";
import { applyForJob, getAllJobs, getApplicationTest, getJobDetails, submitApplicationTest } from "../../controllers/seeker/seeker.jobs.controller";
import { uploadResume } from "../../controllers/seeker/seeker.resumemgmt.controller";
import { getAllJobTests, submitJobTest } from "../../controllers/seeker/seeker.testmgmt.controller";
import { getInterviewInfo, getJobsWithoutScheduledInterview, getJobsWithScheduledInterview, scheduleInterview } from "../../controllers/seeker/seeker.interview.controller";
import { getJobsFormatForDocumentation, submitDocuments, updateApplicantStatus } from "../../controllers/seeker/seeker.documentation.controller";

const seekerRouter = Router();

//* JOBS
seekerRouter.get("/get-jobs", validateAccessToken, validateSeekerSession, getAllJobs);
seekerRouter.get("/get-job/:job_id", validateAccessToken, validateSeekerSession, getJobDetails);
seekerRouter.post("/job-apply", validateAccessToken, validateSeekerSession, applyForJob);
seekerRouter.get("/employer_application_test/:job_id", validateAccessToken, getApplicationTest);
seekerRouter.post("/submit_application_test", validateAccessToken, validateSeekerSession, submitApplicationTest);

//* RESUME MANAGEMENT
seekerRouter.put("/profile/update", validateAccessToken, validateSeekerSession, upload.single("resume"), uploadResume);

//* TEST MANAGEMENT
seekerRouter.get("/get_job_tests", validateAccessToken, validateSeekerSession, getAllJobTests);
seekerRouter.post("/submit_job_test", validateAccessToken, validateSeekerSession, submitJobTest);

//* INTERVIEW MANAGEMENT
seekerRouter.get("/get_nonscheduled_job_interviews", validateAccessToken, validateSeekerSession, getJobsWithoutScheduledInterview);
seekerRouter.get("/get_scheduled_interviews", validateAccessToken, validateSeekerSession, getJobsWithScheduledInterview);
seekerRouter.get("/get_interview_info", validateAccessToken, validateSeekerSession, getInterviewInfo);
seekerRouter.post("/schedule_interview", validateAccessToken, validateSeekerSession, scheduleInterview);

//* DOCUMENTATION MANAGEMENT
seekerRouter.get("/documentation/get_jobs", validateAccessToken, validateSeekerSession, getJobsFormatForDocumentation);
seekerRouter.post("/documentation/update_status", validateAccessToken, validateSeekerSession, updateApplicantStatus);
seekerRouter.post("/documentation/submit_documents", validateAccessToken, validateCompanySession, upload.array("documents"), submitDocuments);

export { seekerRouter };
