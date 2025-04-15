import { Router } from "express";
import { validateAccessToken, validateCompanySession } from "../../middleware/validateToken";
import { upload } from "../../utils/multerConfig";
import { applicationTest, applicationTestCutoff, deleteJob, getApplicationTestDraft, getApplicationTestCutoffDraft, getJobDraft, getJobs, jobPostCreation, toggleJobState } from "../../controllers/employer/employer.jobpost.controller";
import { getApplicantsForJobTest, getDraftCutOff, getDraftQuestion, getInviteMsgDraft, getJobsForJobTest, jobTest, jobTestApplicantsInvite, jobTestCutoff, jobTestInviteMsg } from "../../controllers/employer/employer.jobtest.controller";
import {
  getJobsForInterviews,
  handleCreateInterview,
  handleGetCandidates,
  handleGetInvitationLetter,
  handleGetPanelistEmails,
  handleGetRatingScaleDraft,
  handleGetTimeSlotDrafts,
  handleGradeCandidates,
  handleInviteCandidates,
  handleInvitePanelists,
} from "../../controllers/employer/employer.interview.controller";
import { getCandidatesWithAcceptedOffer, getCandidatesWithOffers, getJobsForDocumentation, getQualifiedCandidates, hireCandidate } from "../../controllers/employer/employer.documentation.controller";

const companyRouter = Router();

// companyRouter.get("/has-applicants", validateAccessToken, validateCompanySession, getJobsWithApplicants);

//* JOB POST CREATION
companyRouter.get("/get_employer_jobs", validateAccessToken, validateCompanySession, getJobs);
companyRouter.delete("/delete_job", validateAccessToken, validateCompanySession, deleteJob);
companyRouter.put("/toggle_job", validateAccessToken, validateCompanySession, toggleJobState);
companyRouter.put("/create", validateAccessToken, validateCompanySession, jobPostCreation);
companyRouter.get("/get_job_info", validateAccessToken, validateCompanySession, getJobDraft);
companyRouter.put("/application-test", validateAccessToken, validateCompanySession, applicationTest);
companyRouter.get("/get_application_test_info", validateAccessToken, validateCompanySession, getApplicationTestDraft);
companyRouter.put("/application-test-cutoff", validateAccessToken, validateCompanySession, applicationTestCutoff);
companyRouter.get("/get_application_test_cutoff", validateAccessToken, validateCompanySession, getApplicationTestCutoffDraft);

//* JOB TEST MANAGEMENT
companyRouter.get("/job_test/jobs", validateAccessToken, validateCompanySession, getJobsForJobTest);
companyRouter.put("/job-test", validateAccessToken, validateCompanySession, jobTest);
companyRouter.get("/job-test/draft-questions", validateAccessToken, validateCompanySession, getDraftQuestion);
companyRouter.patch("/job-test/cutoff", validateAccessToken, validateCompanySession, jobTestCutoff);
companyRouter.get("/job-test/draft-cutoff", validateAccessToken, validateCompanySession, getDraftCutOff);
companyRouter.patch("/job-test/create-message", validateAccessToken, validateCompanySession, jobTestInviteMsg);
companyRouter.get("/job-test/draft-msg", validateAccessToken, validateCompanySession, getInviteMsgDraft);
companyRouter.get("/job-test/get_applicants/:job_id", validateAccessToken, validateCompanySession, getApplicantsForJobTest);
companyRouter.patch("/job-test/applicant-invite", validateAccessToken, jobTestApplicantsInvite);

//* INTERVIEW MANAGEMENT
companyRouter.get("/interview/get_jobs", validateAccessToken, validateCompanySession, getJobsForInterviews);
companyRouter.get("/interview/get_rating_scale/:job_id", validateAccessToken, validateCompanySession, handleGetRatingScaleDraft);
companyRouter.get("/interview/get_time_slots/:job_id", validateAccessToken, validateCompanySession, handleGetTimeSlotDrafts);
companyRouter.get("/interview/get_letter/:job_id", validateAccessToken, validateCompanySession, handleGetInvitationLetter);
companyRouter.get("/interview/get_panelists/:job_id", validateAccessToken, validateCompanySession, handleGetPanelistEmails);
companyRouter.post("/interview/create", validateAccessToken, validateCompanySession, handleCreateInterview);
companyRouter.put("/interview/invite_panelists/:job_id", validateAccessToken, validateCompanySession, handleInvitePanelists);
companyRouter.get("/interview/get_candidates/:job_id", validateAccessToken, validateCompanySession, handleGetCandidates);
companyRouter.put("/interview/invite_candidates/:job_id", validateAccessToken, validateCompanySession, handleInviteCandidates);
companyRouter.put("/interview/grade_candidate", validateAccessToken, validateCompanySession, handleGradeCandidates);

//* DOCUMENTATION MANAGEMENT
companyRouter.get("/documentation/get_jobs", validateAccessToken, validateCompanySession, getJobsForDocumentation);
companyRouter.get("/documentation/get_qualified_candidates", validateAccessToken, validateCompanySession, getQualifiedCandidates);
companyRouter.post("/documentation/hire_candidate", validateAccessToken, validateCompanySession, upload.single("contract_agreement_file"), hireCandidate);
companyRouter.get("/documentation/get_candidates_with_offers", validateAccessToken, validateCompanySession, getCandidatesWithOffers);
companyRouter.get("/documentation/get_candidates_with_accepted_offer", validateAccessToken, validateCompanySession, getCandidatesWithAcceptedOffer);

export { companyRouter };
