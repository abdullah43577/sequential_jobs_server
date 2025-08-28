import { CandidateMedicalData, sendCandidateMedicalEmail } from "../utils/services/emails/candidateMedicalEmailInvite";
import { DowngradeConfirmationEmailData, sendDowngradeConfirmationEmail } from "../utils/services/emails/downgradeEmailService";
import { EmailVerificationSuccessData, sendEmailVerificationSuccessEmail } from "../utils/services/emails/emailVerificationService";
import { ForgotPasswordData, sendForgotPasswordEmail } from "../utils/services/emails/forgotPasswordEmailService";
import { sendGracePeriodNotificationEmail } from "../utils/services/emails/gracePeriodEmailService";
import { HireCandidateEmailData, sendHireCandidateEmail } from "../utils/services/emails/hireCandidateEmailService";
import { CandidateInviteData, sendCandidateInviteEmail } from "../utils/services/emails/interviewCandidatesEmailService";
import { MatchingJobEmailData, sendMatchingJobEmail } from "../utils/services/emails/matchingJobEmailService";
import { MedicalistInviteData, sendMedicalistInviteEmail } from "../utils/services/emails/medicalistInviteEmailService";
import { MedicalSubmissionEmailData, sendMedicalSubmissionEmail } from "../utils/services/emails/medicalSubmittedEmailService";
import { OAuthWelcomeEmailData, sendOAuthWelcomeEmail } from "../utils/services/emails/OAuthWelcomeEmailData";
import { PanelistInviteData, sendPanelistInviteEmail } from "../utils/services/emails/panelistEmailService";
import { ExtensionConfirmationEmailData, sendExtensionConfirmationEmail } from "../utils/services/emails/planExtensionEmailService";
import { ResetPasswordData, sendResetPasswordEmail } from "../utils/services/emails/resetPasswordEmailService";
import { sendResumeReminderEmail } from "../utils/services/emails/ResumeReminderEmailService";
import { ReuploadDocumentData, sendReuploadDocumentEmail } from "../utils/services/emails/reuploadDocumentEmailService";
import { InterviewEmailData, sendCandidateInterviewEmail, sendEmployerInterviewEmail, sendPanelistInterviewEmail } from "../utils/services/emails/scheduleInterviewEmailService";
import { MedicalEmailData, sendEmployerMedicalEmail, sendMedicalExpertEmail, sendCandidateMedicalEmail as sendCandidateMedicalEmailData } from "../utils/services/emails/scheduleMedicalEmailService";
import { SeekerOAuthWelcomeEmailData, sendSeekerOAuthWelcomeEmail } from "../utils/services/emails/SeekerOAuthWelcomeEmailService";
import { JobSeekerWelcomeEmailData, sendJobSeekerWelcomeEmail } from "../utils/services/emails/SeekerWelcomeEmailService";
import { PaymentFailureEmailData, sendPaymentFailureEmail } from "../utils/services/emails/sendPaymentFailureEmailService";
import { sendTicketCreatedEmail, TicketCreatedEmailData } from "../utils/services/emails/sendTicketEmail";
import { sendTicketUpdateEmail, TicketUpdateEmailData } from "../utils/services/emails/sendTicketUpdateEmail";
import { sendUpgradeConfirmationEmail, UpgradeConfirmationEmailData } from "../utils/services/emails/sendUpgradeConfirmationEmailService";
import { sendSubscriptionExpiredEmail } from "../utils/services/emails/subscriptionExpiredEmailService";
import { sendTestApplicantsEmail, TestApplicantsData } from "../utils/services/emails/testApplicantsEmailInvite";
import { sendTestSubmissionNotificationEmail, TestSubmissionNotificationData } from "../utils/services/emails/testSubmissionEmailService";
import { sendTrialExpiredEmail } from "../utils/services/emails/TrialExpiredEmailService";
import { sendWelcomeEmail, WelcomeEmailData } from "../utils/services/emails/welcomeEmailService";
import { registerEmailHandler } from "./globalEmailQueueHandler";
import { JOB_KEY, SCHEDULED_JOB_KEY } from "./jobKeys";

/* AUTH FLOW EMAIL REGISTRATION FUNCTIONALITIES */

export const initializeEmailHandlers = function () {
  try {
    //* register welcome email
    registerEmailHandler(JOB_KEY.REGISTRATION, async (data: WelcomeEmailData) => {
      return await sendWelcomeEmail(data);
    });

    registerEmailHandler(JOB_KEY.REGISTRATION_SEEKER, async (data: JobSeekerWelcomeEmailData) => {
      return await sendJobSeekerWelcomeEmail(data);
    });

    registerEmailHandler(JOB_KEY.REGISTRATION_OAUTH, async (data: OAuthWelcomeEmailData) => {
      return await sendOAuthWelcomeEmail(data);
    });

    registerEmailHandler(JOB_KEY.REGISTRATION_OAUTH_SEEKER, async (data: SeekerOAuthWelcomeEmailData) => {
      return await sendSeekerOAuthWelcomeEmail(data);
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
    registerEmailHandler(JOB_KEY.MATCHING_JOB_DETAIL, async (data: MatchingJobEmailData) => {
      return await sendMatchingJobEmail(data);
    });

    registerEmailHandler(JOB_KEY.APPLICATION_TEST_SUBMISSION, async (data: TestSubmissionNotificationData) => {
      return await sendTestSubmissionNotificationEmail(data);
    });

    //* JOB TEST MANAGEMENT WORKFLOW
    registerEmailHandler(JOB_KEY.JOB_TEST, async (data: TestApplicantsData) => {
      return await sendTestApplicantsEmail(data);
    });

    //* send mail to employer once a job test has been taken by a candidate
    registerEmailHandler(JOB_KEY.JOB_TEST_SUBMISSION, async (data: TestSubmissionNotificationData) => {
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

    // register for candidate schedule
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

    registerEmailHandler(JOB_KEY.MEDICALIST_INVITE, async (data: MedicalistInviteData) => {
      return await sendMedicalistInviteEmail(data);
    });

    registerEmailHandler(JOB_KEY.MEDICALIST_CANDIDATE_INVITE, async (data: CandidateMedicalData) => {
      return await sendCandidateMedicalEmail(data);
    });

    /* WHEN A CANDIDATE SCHEDULES FOR AN INTERVIEW, NOTIFY EMPLOYER, MEDICALISTS AND THE CANDIDATE HIMSELF */

    // register for employers
    registerEmailHandler(JOB_KEY.MEDICALIST_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL, async (data: MedicalEmailData) => {
      return await sendEmployerMedicalEmail(data);
    });

    type MedicalistReformattedInfo = MedicalEmailData & {
      medicalistEmail: string;
      medicalistFirstName: string;
      medicalistLastName: string;
    };

    //* register for medicalists
    registerEmailHandler(JOB_KEY.MEDICALIST_CANDIDATE_SCHEDULE_MEDICALISTS_EMAIL, async (data: MedicalistReformattedInfo) => {
      const { medicalistEmail, medicalistFirstName, medicalistLastName, ...medicalData } = data;

      const medicalist = {
        email: medicalistEmail,
        firstName: medicalistFirstName,
        lastName: medicalistLastName,
      };

      return await sendMedicalExpertEmail(medicalData, medicalist);
    });

    registerEmailHandler(JOB_KEY.MEDICALIST_CANDIDATE_SCHEDULE, async (data: MedicalEmailData) => {
      return await sendCandidateMedicalEmailData(data);
    });

    registerEmailHandler(JOB_KEY.MEDICALIST_CANDIDATE_TEST_SUBMISSION, async (data: MedicalSubmissionEmailData) => {
      return await sendMedicalSubmissionEmail(data);
    });

    /* PRICING MANAGEMENT WORKFLOW */
    registerEmailHandler(JOB_KEY.UPGRADE_CONFIRMATION_MAIL, async (data: UpgradeConfirmationEmailData) => {
      return await sendUpgradeConfirmationEmail(data);
    });

    registerEmailHandler(JOB_KEY.PAYMENT_FAILURE_MAIL, async (data: PaymentFailureEmailData) => {
      return await sendPaymentFailureEmail(data);
    });

    /* TICKET SYSTEM */
    registerEmailHandler(JOB_KEY.CREATE_TICKET, async (data: TicketCreatedEmailData) => {
      return await sendTicketCreatedEmail(data);
    });

    registerEmailHandler(JOB_KEY.UPDATE_TICKET, async (data: TicketUpdateEmailData) => {
      return await sendTicketUpdateEmail(data);
    });

    /* ADMIN FUNCTIONALITY HERE */
    registerEmailHandler(JOB_KEY.DOWNGRADE_EMAIL, async (data: DowngradeConfirmationEmailData) => {
      return await sendDowngradeConfirmationEmail(data);
    });

    registerEmailHandler(JOB_KEY.PLAN_EXTENSION, async (data: ExtensionConfirmationEmailData) => {
      return await sendExtensionConfirmationEmail(data);
    });

    /* END OF ADMIN EMAIL FUNCTIONALITY REGISTRATION */

    /* CRON JOBS HERE */

    // Register email handlers for scheduled jobs (add these to your existing emailHandlers.ts)

    // Trial expired email handler
    registerEmailHandler(SCHEDULED_JOB_KEY.TRIAL_EXPIRED, async (data: { email: string; first_name: string; last_name: string; btnUrl: string }) => {
      return await sendTrialExpiredEmail(data);
    });

    // Grace period notification email handlers
    registerEmailHandler(SCHEDULED_JOB_KEY.GRACE_PERIOD_NOTIFICATION, async (data: { email: string; first_name: string; last_name: string; graceEndDate: Date; btnUrl: string }) => {
      return await sendGracePeriodNotificationEmail(data);
    });

    // Subscription expired email handler
    registerEmailHandler(SCHEDULED_JOB_KEY.SUBSCRIPTION_EXPIRED, async (data: { email: string; first_name: string; last_name: string; previousTier: string; btnUrl: string }) => {
      return await sendSubscriptionExpiredEmail(data);
    });

    // Resume reminder email handler
    registerEmailHandler(SCHEDULED_JOB_KEY.RESUME_REMINDER, async (data: { email: string; first_name: string; last_name: string; btnUrl: string }) => {
      return await sendResumeReminderEmail(data);
    });
  } catch (error) {
    throw error;
  }
};
