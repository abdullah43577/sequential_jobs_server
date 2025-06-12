import { registrationEmail } from "../../nodemailer.ts/email-templates/registration-email";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface WelcomeEmailData {
  email: string;
  firstName: string;
  verificationToken: string;
  subscriptionPlan?: string;
  trialDays?: number;
  verificationUrl?: string;
}

interface EmailResult {
  html: string;
  subject: string;
}

const generateWelcomeEmailData = (data: WelcomeEmailData) => ({
  title: "Welcome to Sequential Jobs!",
  name: data.firstName,
  message: `Thank you for creating an account with Sequential Jobs. We're excited to help you find your next opportunity in the tech industry.${
    data.subscriptionPlan && data.trialDays ? `\n\nYou've been automatically enrolled in our ${data.subscriptionPlan} plan for the next ${data.trialDays} days.` : ""
  }\n\nTo get started, please verify your email address by clicking the button below. This helps us ensure the security of your account.`,
  btnTxt: "Verify Email Address",
  btnAction: data.verificationUrl || `https://sequential-jobs-server.onrender.com/api/auth/verify-email?token=${data.verificationToken}`,
});

export const createWelcomeEmail = (data: WelcomeEmailData): EmailResult => {
  const emailData = generateWelcomeEmailData(data);
  const html = registrationEmail(emailData);
  const subject = "Welcome to Sequential Jobs - Please Verify Your Email";

  return { html: html.html, subject };
};

export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<void> => {
  const { html, subject } = createWelcomeEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
