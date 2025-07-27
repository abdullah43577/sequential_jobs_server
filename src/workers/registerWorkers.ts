import { EmailVerificationSuccessData, sendEmailVerificationSuccessEmail } from "../utils/services/emails/emailVerificationService";
import { ForgotPasswordData, sendForgotPasswordEmail } from "../utils/services/emails/forgotPasswordEmailService";
import { PanelistInviteData, sendPanelistInviteEmail } from "../utils/services/emails/panelistEmailService";
import { ResetPasswordData, sendResetPasswordEmail } from "../utils/services/emails/resetPasswordEmailService";
import { sendWelcomeEmail, WelcomeEmailData } from "../utils/services/emails/welcomeEmailService";
import { registerEmailHandler } from "./globalEmailQueueHandler";

export const JOB_KEY = {
  REGISTRATION: "welcome_email",
  EMAIL_VERIFICATION: "verification_email",
  FORGOT_PASSWORD: "forgot_password",
  RESET_PASSWORD: "reset_password",
  PANELIST_INVITE: "panelist_invite",
};

/* AUTH FLOW EMAIL REGISTRATION FUNCTIONALITIES */

//* register welcome email
registerEmailHandler(JOB_KEY.REGISTRATION, async (data: WelcomeEmailData) => {
  return await sendWelcomeEmail({
    email: data.email,
    firstName: data.firstName,
    verificationToken: data.verificationToken,
    subscriptionPlan: "Sequential Super Pro",
    trialDays: 30,
  });
});

//* register verification email
registerEmailHandler(JOB_KEY.EMAIL_VERIFICATION, async (data: EmailVerificationSuccessData) => {
  return await sendEmailVerificationSuccessEmail({
    email: data.email,
    firstName: data.firstName,
    baseUrl: data.baseUrl,
  });
});

//* register forgot password
registerEmailHandler(JOB_KEY.FORGOT_PASSWORD, async (data: ForgotPasswordData) => {
  return await sendForgotPasswordEmail({
    email: data.email,
    first_name: data.first_name,
    baseUrl: data.baseUrl,
    resetToken: data.resetToken,
  });
});

//* register reset password
registerEmailHandler(JOB_KEY.RESET_PASSWORD, async (data: ResetPasswordData) => {
  return await sendResetPasswordEmail({
    email: data.email,
    first_name: data.first_name,
  });
});

registerEmailHandler(JOB_KEY.PANELIST_INVITE, async (data: PanelistInviteData) => {
  return await sendPanelistInviteEmail({
    email: data.email,
    jobTitle: data.jobTitle,
    isNewPanelist: data.isNewPanelist,
    tempPassword: data.tempPassword,
    recipientName: data.recipientName,
    isTemporary: data.isTemporary,
  });
});
