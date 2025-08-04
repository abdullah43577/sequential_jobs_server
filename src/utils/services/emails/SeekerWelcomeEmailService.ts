import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface JobSeekerWelcomeEmailData {
  email: string;
  name: string;
  verificationToken: string;
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateJobSeekerWelcomeEmailData = (data: JobSeekerWelcomeEmailData) => ({
  type: "invite" as EmailTypes,
  title: "Welcome to Sequential Jobs!",
  recipientName: data.name,
  message: `We're thrilled to have you join Sequential Jobs, the platform where skilled talent meets opportunity. Our mission is to help you get discovered by companies looking for exactly what you offer.\n\nPlease verify your email address by clicking the button below. This helps us ensure the security of your account.`,
  buttonText: "Verify Email Address",
  buttonAction: `https://node-test.sequentialjobs.watchdoglogisticsng.com/api/auth/verify-email?token=${data.verificationToken}`,
});

export const createJobSeekerWelcomeEmail = (data: JobSeekerWelcomeEmailData): EmailResult => {
  const emailData = generateJobSeekerWelcomeEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = "Welcome to Sequential Jobs - Verify Your Email to Get Started";

  return { react, subject };
};

export const sendJobSeekerWelcomeEmail = async (data: JobSeekerWelcomeEmailData): Promise<void> => {
  const { react, subject } = createJobSeekerWelcomeEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
