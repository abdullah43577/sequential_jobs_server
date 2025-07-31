import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface OAuthWelcomeEmailData {
  email: string;
  name: string;
  subscriptionPlan?: string;
  trialDays?: number;
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateOAuthWelcomeEmailData = (data: OAuthWelcomeEmailData) => ({
  type: "invite" as EmailTypes,
  title: "Welcome to Sequential Jobs!",
  recipientName: data.name,
  message: `Thank you for signing up with Google on Sequential Jobs. We're thrilled to have you on board!${
    data.subscriptionPlan && data.trialDays ? `\n\nYou’ve been enrolled in our **${data.subscriptionPlan}** plan with a **${data.trialDays}-day trial** to help you get started.` : ""
  }\n\nExplore job listings, connect with top companies, and make the most of your journey with us.`,
});

export const createOAuthWelcomeEmail = (data: OAuthWelcomeEmailData): EmailResult => {
  const emailData = generateOAuthWelcomeEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = "Welcome to Sequential Jobs";

  return { react, subject };
};

export const sendOAuthWelcomeEmail = async (data: OAuthWelcomeEmailData): Promise<void> => {
  const { react, subject } = createOAuthWelcomeEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
