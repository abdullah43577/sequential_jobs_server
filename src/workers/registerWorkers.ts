import { EmailVerificationSuccessData, sendEmailVerificationSuccessEmail } from "../utils/services/emails/emailVerificationService";
import { ForgotPasswordData, sendForgotPasswordEmail } from "../utils/services/emails/forgotPasswordEmailService";
import { HireCandidateEmailData, sendHireCandidateEmail } from "../utils/services/emails/hireCandidateEmailService";
import { CandidateInviteData, sendCandidateInviteEmail } from "../utils/services/emails/interviewCandidatesEmailService";
import { PanelistInviteData, sendPanelistInviteEmail } from "../utils/services/emails/panelistEmailService";
import { ResetPasswordData, sendResetPasswordEmail } from "../utils/services/emails/resetPasswordEmailService";
import { ReuploadDocumentData, sendReuploadDocumentEmail } from "../utils/services/emails/reuploadDocumentEmailService";
import { InterviewEmailData, PanelistData, sendCandidateInterviewEmail, sendEmployerInterviewEmail, sendPanelistInterviewEmail } from "../utils/services/emails/scheduleInterviewEmailService";
import { sendTestApplicantsEmail, TestApplicantsData } from "../utils/services/emails/testApplicantsEmailInvite";
import { sendTestSubmissionNotificationEmail, TestSubmissionNotificationData } from "../utils/services/emails/testSubmissionEmailService";
import { sendWelcomeEmail, WelcomeEmailData } from "../utils/services/emails/welcomeEmailService";
import { registerEmailHandler } from "./globalEmailQueueHandler";

export const JOB_KEY = {
  REGISTRATION: "welcome_email",
  EMAIL_VERIFICATION: "verification_email",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",

  APPLICATION_TEST_SUBMISSION: "application_test_submission",
  JOB_TEST: "job_test_candidate_invite",
  PANELIST_INVITE: "panelist_invite",
  INTERVIEW_CANDIDATE_INVITE: "interview_candidate_invite",
  INTERVIEW_CANDIDATE_SCHEDULE: "interview_candidate_schedule",
  INTERVIEW_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL: "interview_candidate_schedule_employer_email",
  INTERVIEW_CANDIDATE_SCHEDULE_PAHELISTS_EMAIL: "interview_candidate_schedule_panelists_email",

  DOCUMENT_SEND_CANDIDATE_OFFER: "document_send_candidate_offer",
  DOCUMENT_REQUEST_REUPLOAD_DOC: "document_request_reupload_doc",
};

/* AUTH FLOW EMAIL REGISTRATION FUNCTIONALITIES */

//* register welcome email
registerEmailHandler(JOB_KEY.REGISTRATION, async (data: WelcomeEmailData) => {
  return await sendWelcomeEmail(data);
});

//* register verification email
registerEmailHandler(JOB_KEY.EMAIL_VERIFICATION, async (data: EmailVerificationSuccessData) => {
  return await sendEmailVerificationSuccessEmail(data);
});

//* register forgot password
registerEmailHandler(JOB_KEY.FORGOT_PASSWORD, async (data: ForgotPasswordData) => {
  return await sendForgotPasswordEmail(data);
});

//* register reset password
registerEmailHandler(JOB_KEY.RESET_PASSWORD, async (data: ResetPasswordData) => {
  return await sendResetPasswordEmail(data);
});

/* JOBS WORKFLOW */
registerEmailHandler(JOB_KEY.APPLICATION_TEST_SUBMISSION, async (data: TestSubmissionNotificationData) => {
  return await sendTestSubmissionNotificationEmail(data);
});

//* JOB TEST MANAGEMENT WORKFLOW
registerEmailHandler(JOB_KEY.JOB_TEST, async (data: TestApplicantsData) => {
  return await sendTestApplicantsEmail(data);
});

//* send mail to employer once a job test has been taken by a candidate
registerEmailHandler(JOB_KEY.JOB_TEST, async (data: TestSubmissionNotificationData) => {
  return await sendTestSubmissionNotificationEmail(data);
});

/* INTERVIEW MANAGEMENT WORKFLOW */

//* invite panelist for interview
registerEmailHandler(JOB_KEY.PANELIST_INVITE, async (data: PanelistInviteData) => {
  return await sendPanelistInviteEmail(data);
});

registerEmailHandler(JOB_KEY.INTERVIEW_CANDIDATE_INVITE, async (data: CandidateInviteData) => {
  return await sendCandidateInviteEmail(data);
});

// JOB SEEKER STANDPOINT
// register for employer
registerEmailHandler(JOB_KEY.INTERVIEW_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL, async (data: InterviewEmailData) => {
  return await sendEmployerInterviewEmail(data);
});

type PanelistsReformattedInfo = InterviewEmailData & { panelistEmail: string; panelistFirstName: string; panelistLastName: string };

// register for panelists
registerEmailHandler(JOB_KEY.INTERVIEW_CANDIDATE_SCHEDULE_PAHELISTS_EMAIL, async (data: PanelistsReformattedInfo) => {
  // ✅ Extract panelist data and reconstruct the object
  const { panelistEmail, panelistFirstName, panelistLastName, ...interviewData } = data;

  const panelist = {
    email: panelistEmail,
    firstName: panelistFirstName,
    lastName: panelistLastName,
  };

  // ✅ call with the expected signature
  return await sendPanelistInterviewEmail(interviewData as InterviewEmailData, panelist);
});

// register for candidate
registerEmailHandler(JOB_KEY.INTERVIEW_CANDIDATE_SCHEDULE, async (data: InterviewEmailData) => {
  return await sendCandidateInterviewEmail(data);
});

/* DOCUMENTATION MANAGEMENT */
registerEmailHandler(JOB_KEY.DOCUMENT_SEND_CANDIDATE_OFFER, async (data: HireCandidateEmailData) => {
  return await sendHireCandidateEmail(data);
});

registerEmailHandler(JOB_KEY.DOCUMENT_REQUEST_REUPLOAD_DOC, async (data: ReuploadDocumentData) => {
  return await sendReuploadDocumentEmail(data);
});

/* MEDICAL MANAGEMENT WORKFLOW */
