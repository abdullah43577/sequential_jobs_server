import { Router } from "express";
import { validateAccessToken, validateCompanyAdminSession, validateCompanySession, validateMedicalistSession, validatePanelistSession } from "../../middleware/validateToken";
import { upload } from "../../utils/multerConfig";
import {
  applicationTest,
  applicationTestCutoff,
  deleteJob,
  getApplicationTestDraft,
  getApplicationTestCutoffDraft,
  getJobDraft,
  getJobs,
  jobPostCreation,
  toggleJobState,
  handleBulkUpload,
} from "../../controllers/employer/employer.jobpost.controller";
import {
  getApplicantsForJobTest,
  getCandidatesByTestStatus,
  getDraftCutOff,
  getDraftQuestion,
  getInviteMsgDraft,
  getJobsForJobTest,
  jobTest,
  jobTestApplicantsInvite,
  jobTestCutoff,
  jobTestInviteMsg,
} from "../../controllers/employer/employer.jobtest.controller";
import {
  getCandidatesInvitedForInterview,
  getJobsForInterviews,
  handleCreateInterview,
  handleFetchRatingDetailsForPanelists,
  handleGetCandidates,
  handleGetInvitationLetter,
  handleGetPanelistEmails,
  handleGetRatingScaleDraft,
  handleGetTimeSlotDrafts,
  handleGradeCandidate,
  handleInviteCandidates,
  handleInvitePanelists,
} from "../../controllers/employer/employer.interview.controller";
import { getCandidatesWithAcceptedOffer, getCandidatesWithOffers, getJobsForDocumentation, getQualifiedCandidates, sendCandidateOffer } from "../../controllers/employer/employer.documentation.controller";
import { getCandidatesInvitedForMedicals, getJobsForMedical, handleSubmitMedicalTest, inviteMedicalCandidates, setMedicalAvailability } from "../../controllers/employer/medicals/employer.medical.controller";
import { GetActiveJobs, GetAllJobs, GetAllJobsWithCandidatesHires, TotalApplicantsTable } from "../../controllers/employer/employer.dashboard.controller";
import { createCheckoutSession, getPricingInfo, handleWebhook } from "../../controllers/employer/employer.pricing.controller";

const companyRouter = Router();

//* DASHBOARD
companyRouter.post("/jobs/bulk_upload", validateAccessToken, validateCompanyAdminSession, upload.single("bulk_jobs"), handleBulkUpload);
companyRouter.get("/get_all_jobs_with_applicants", validateAccessToken, validateCompanySession, TotalApplicantsTable);
companyRouter.get("/get_jobs_with_hires", validateAccessToken, validateCompanySession, GetAllJobsWithCandidatesHires);
companyRouter.get("/get_all_jobs", validateAccessToken, validateCompanySession, GetAllJobs);
companyRouter.get("/get_active_jobs", validateAccessToken, validateCompanySession, GetActiveJobs);

//* JOB POST CREATION
companyRouter.get("/get_employer_jobs", validateAccessToken, validateCompanySession, getJobs);
companyRouter.delete("/delete_job", validateAccessToken, validateCompanySession, deleteJob);
companyRouter.put("/toggle_job", validateAccessToken, validateCompanySession, toggleJobState);
companyRouter.put("/create", validateAccessToken, validateCompanyAdminSession, jobPostCreation);
companyRouter.get("/get_job_info", validateAccessToken, validateCompanyAdminSession, getJobDraft);
companyRouter.put("/application-test", validateAccessToken, validateCompanyAdminSession, applicationTest);
companyRouter.get("/get_application_test_info", validateAccessToken, validateCompanySession, getApplicationTestDraft);
companyRouter.put("/application-test-cutoff", validateAccessToken, validateCompanyAdminSession, applicationTestCutoff);
companyRouter.get("/get_application_test_cutoff", validateAccessToken, validateCompanySession, getApplicationTestCutoffDraft);

//* JOB TEST MANAGEMENT
companyRouter.get("/job_test/jobs", validateAccessToken, validateCompanySession, getJobsForJobTest);
companyRouter.get("/job-test/getCandidatesByStatus", validateAccessToken, validateCompanySession, getCandidatesByTestStatus);
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
companyRouter.get("/interview/get_candidates_invited_for_interview", validateAccessToken, validateCompanySession, getCandidatesInvitedForInterview);
companyRouter.get("/interview/get_rating_scale/:job_id", validateAccessToken, validateCompanySession, handleGetRatingScaleDraft);
companyRouter.get("/interview/get_time_slots/:job_id", validateAccessToken, validateCompanySession, handleGetTimeSlotDrafts);
companyRouter.get("/interview/get_letter/:job_id", validateAccessToken, validateCompanySession, handleGetInvitationLetter);
companyRouter.get("/interview/get_panelists/:job_id", validateAccessToken, validateCompanySession, handleGetPanelistEmails);
companyRouter.post("/interview/create", validateAccessToken, validateCompanySession, handleCreateInterview);
companyRouter.put("/interview/invite_panelists/:job_id", validateAccessToken, validateCompanySession, handleInvitePanelists);
companyRouter.get("/interview/get_candidates/:job_id", validateAccessToken, validateCompanySession, handleGetCandidates);
companyRouter.put("/interview/invite_candidates/:job_id", validateAccessToken, validateCompanySession, handleInviteCandidates);
companyRouter.post("/interview/rating_scale", validateAccessToken, validatePanelistSession, handleFetchRatingDetailsForPanelists);
companyRouter.put("/interview/grade_candidate", validateAccessToken, validatePanelistSession, handleGradeCandidate);

//* DOCUMENTATION MANAGEMENT
companyRouter.get("/documentation/get_jobs", validateAccessToken, validateCompanySession, getJobsForDocumentation);
companyRouter.get("/documentation/get_qualified_candidates", validateAccessToken, validateCompanySession, getQualifiedCandidates);
companyRouter.post("/documentation/send_offer/:job_id", validateAccessToken, validateCompanySession, upload.single("contract_agreement_file"), sendCandidateOffer);
companyRouter.get("/documentation/get_candidates_with_offers", validateAccessToken, validateCompanySession, getCandidatesWithOffers);
companyRouter.get("/documentation/get_candidates_with_accepted_offer", validateAccessToken, validateCompanySession, getCandidatesWithAcceptedOffer);

//* MEDICAL MANAGEMENT
companyRouter.get("/medical/get_jobs", validateAccessToken, validateCompanySession, getJobsForMedical);
companyRouter.get("/medical/get_candidates_invited", validateAccessToken, validateCompanySession, getCandidatesInvitedForMedicals);
companyRouter.post("/medical/set_medical_schedule", validateAccessToken, validateCompanySession, setMedicalAvailability);
companyRouter.put("/medical/invite_candidates/:job_id", validateAccessToken, validateCompanySession, inviteMedicalCandidates);
companyRouter.put("/medical/submit_medical", validateAccessToken, validateMedicalistSession, upload.array("medical_files"), handleSubmitMedicalTest);

//* PRICING MANAGEMENT
companyRouter.get("/get_pricing_info", validateAccessToken, validateCompanyAdminSession, getPricingInfo);
companyRouter.post("/payment/create-checkout-session", validateAccessToken, validateCompanySession, createCheckoutSession);
companyRouter.post("/payment/webhook", handleWebhook);

export { companyRouter };
