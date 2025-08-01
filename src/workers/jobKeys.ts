export const JOB_KEY = {
  REGISTRATION: "welcome_email",
  REGISTRATION_SEEKER: "welcome_email_seeker",
  REGISTRATION_OAUTH: "welcome_email_oauth_flow",
  REGISTRATION_OAUTH_SEEKER: "welcome_email_oauth_flow_seeker",
  EMAIL_VERIFICATION: "verification_email",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",

  MATCHING_JOB_DETAIL: "job_match_candidate_email",
  APPLICATION_TEST_SUBMISSION: "application_test_submission",
  JOB_TEST: "job_test_candidate_invite",
  JOB_TEST_SUBMISSION: "job_test_candidate_submission",
  PANELIST_INVITE: "panelist_invite",

  INTERVIEW_CANDIDATE_INVITE: "interview_candidate_invite",
  INTERVIEW_CANDIDATE_SCHEDULE: "interview_candidate_schedule",
  INTERVIEW_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL: "interview_candidate_schedule_employer_email",
  INTERVIEW_CANDIDATE_SCHEDULE_PAHELISTS_EMAIL: "interview_candidate_schedule_panelists_email",

  DOCUMENT_SEND_CANDIDATE_OFFER: "document_send_candidate_offer",
  DOCUMENT_REQUEST_REUPLOAD_DOC: "document_request_reupload_doc",

  MEDICALIST_INVITE: "medicalist_invite",
  MEDICALIST_CANDIDATE_INVITE: "medicalist_candidate_invite",
  MEDICALIST_CANDIDATE_SCHEDULE: "medicalist_candidate_schedule",
  MEDICALIST_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL: "medicalist_candidate_schedule_employer_email",
  MEDICALIST_CANDIDATE_SCHEDULE_MEDICALISTS_EMAIL: "medicalist_candidate_schedule_medicalists_email",

  UPGRADE_CONFIRMATION_MAIL: "upgrade_confirmation_mail",
  PAYMENT_FAILURE_MAIL: "payment_failure_mail",

  CREATE_TICKET: "create_ticket",
  UPDATE_TICKET: "update_ticket",
};

// Add new job keys for scheduled tasks and must conform with the one in the cron-jobs screen
export const SCHEDULED_JOB_KEY = {
  TRIAL_EXPIRED: "trial_expired_email",
  GRACE_PERIOD_NOTIFICATION: "grace_period_notification_email",
  SUBSCRIPTION_EXPIRED: "subscription_expired_email",
  SUBSCRIPTION_EXPIRY_WARNING: "subscription_expiry_warning",
  RESUME_REMINDER: "resume_reminder_email",
};
