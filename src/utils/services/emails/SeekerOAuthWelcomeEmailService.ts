import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface SeekerOAuthWelcomeEmailData {
  email: string;
  name: string;
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateSeekerOAuthWelcomeEmailData = (data: SeekerOAuthWelcomeEmailData) => ({
  type: "invite" as EmailTypes,
  title: "Welcome to Sequential Jobs!",
  recipientName: data.name,
  message: `Thank you for signing up with Google on Sequential Jobs. We’re excited to support your career journey!\n\nStart exploring jobs, build your profile, and connect with employers actively seeking talent like you.`,
});

export const createSeekerOAuthWelcomeEmail = (data: SeekerOAuthWelcomeEmailData): EmailResult => {
  const emailData = generateSeekerOAuthWelcomeEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = "Welcome to Sequential Jobs";

  return { react, subject };
};

export const sendSeekerOAuthWelcomeEmail = async (data: SeekerOAuthWelcomeEmailData): Promise<void> => {
  const { react, subject } = createSeekerOAuthWelcomeEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
