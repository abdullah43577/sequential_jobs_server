import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface WelcomeEmailData {
  email: string;
  name: string;
  verificationToken: string;
  subscriptionPlan?: string;
  trialDays?: number;
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateWelcomeEmailData = (data: WelcomeEmailData) => ({
  type: "invite" as EmailTypes,
  title: "Welcome to Sequential Jobs!",
  recipientName: data.name,
  message: `Thank you for creating an account with Sequential Jobs. We're excited to help you find your next opportunity in the tech industry.${
    data.subscriptionPlan && data.trialDays ? `\n\nYou've been automatically enrolled in our ${data.subscriptionPlan} plan for the next ${data.trialDays} days.` : ""
  }\n\nTo get started, please verify your email address by clicking the button below. This helps us ensure the security of your account.`,
  buttonText: "Verify Email Address",
  buttonAction: `https://node-test.sequentialjobs.watchdoglogisticsng.com/api/auth/verify-email?token=${data.verificationToken}`,
});

export const createWelcomeEmail = (data: WelcomeEmailData): EmailResult => {
  const emailData = generateWelcomeEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = "Welcome to Sequential Jobs - Please Verify Your Email";

  return { react, subject };
};

export const sendWelcomeEmail = async (data: WelcomeEmailData): Promise<void> => {
  const { react, subject } = createWelcomeEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
