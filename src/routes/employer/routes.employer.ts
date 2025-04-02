import { Router } from "express";
import { validateAccessToken, validateCompanySession } from "../../middleware/validateToken";
import {
  applicationTest,
  jobPostCreation,
  applicationTestCutoff,
  jobTest,
  jobTestCutoff,
  jobTestInviteMsg,
  handleCreateInterview,
  handleInvitePanelists,
  getJobsWithApplicants,
  jobTestApplicantsInvite,
  getQualifiedCandidates,
  handleInviteCandidates,
  hireCandidate,
} from "../../controllers/employer.controller";
import { upload } from "../../utils/multerConfig";

const companyRouter = Router();

companyRouter.get("/has-applicants", validateAccessToken, validateCompanySession, getJobsWithApplicants);

//* JOB POST CREATION
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

//* DOCUMENTATION MANAGEMENT
companyRouter.get("/documentation/get_qualified_candidates", validateAccessToken, validateCompanySession, getQualifiedCandidates);
companyRouter.post("/documentation/hire_candidate", validateAccessToken, validateCompanySession, upload.single("contract_agreement_file"), hireCandidate);

export { companyRouter };
