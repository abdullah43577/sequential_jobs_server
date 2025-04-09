import { Router } from "express";
import { validateAccessToken, validateCompanySession } from "../../middleware/validateToken";
import { upload } from "../../utils/multerConfig";
import { getJobsWithApplicants } from "../../controllers/employer.controller";
import { applicationTest, applicationTestCutoff, getJobs, jobPostCreation } from "../../controllers/employer/employer.jobpost.controller";
import { jobTest, jobTestApplicantsInvite, jobTestCutoff, jobTestInviteMsg } from "../../controllers/employer/employer.jobtest.controller";
import { handleCreateInterview, handleGradeCandidates, handleInviteCandidates, handleInvitePanelists } from "../../controllers/employer/employer.interview.controller";
import { getQualifiedCandidates, hireCandidate } from "../../controllers/employer/employer.documentation.controller";

const companyRouter = Router();

companyRouter.get("/has-applicants", validateAccessToken, validateCompanySession, getJobsWithApplicants);

//* JOB POST CREATION
companyRouter.get("/get_employer_jobs", validateAccessToken, validateCompanySession, getJobs);
companyRouter.put("/create", validateAccessToken, validateCompanySession, jobPostCreation);
companyRouter.put("/application-test", validateAccessToken, validateCompanySession, applicationTest);
companyRouter.put("/application-test-cutoff", validateAccessToken, validateCompanySession, applicationTestCutoff);

//* JOB TEST MANAGEMENT
companyRouter.put("/job-test", validateAccessToken, validateCompanySession, jobTest);
companyRouter.patch("/job-test/cutoff", validateAccessToken, validateCompanySession, jobTestCutoff);
companyRouter.patch("/job-test/create-message", validateAccessToken, validateCompanySession, jobTestInviteMsg);
companyRouter.patch("/job-test/applicant-invite", validateAccessToken, jobTestApplicantsInvite);

//* INTERVIEW MANAGEMENT
companyRouter.post("/interview/create", validateAccessToken, validateCompanySession, handleCreateInterview);
companyRouter.put("/interview/invite_panelists/:interview_id", validateAccessToken, validateCompanySession, handleInvitePanelists);
companyRouter.put("/interview/invite_candidates/:interview_id", validateAccessToken, validateCompanySession, handleInviteCandidates);
companyRouter.put("/interview/grade_candidate", validateAccessToken, validateCompanySession, handleGradeCandidates);

//* DOCUMENTATION MANAGEMENT
companyRouter.get("/documentation/get_qualified_candidates", validateAccessToken, validateCompanySession, getQualifiedCandidates);
companyRouter.post("/documentation/hire_candidate", validateAccessToken, validateCompanySession, upload.single("contract_agreement_file"), hireCandidate);

export { companyRouter };
