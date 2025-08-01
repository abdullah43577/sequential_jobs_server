import { generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface EmailVerificationSuccessData {
  email: string;
  firstName: string;
  baseUrl: string;
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateEmailVerificationSuccessData = (data: EmailVerificationSuccessData) => ({
  title: "Email Verified Successfully!",
  recipientName: data.firstName,
  message: "Your email has been successfully verified. You can now log in to your account and start exploring.",
  buttonText: "Login",
  buttonAction: `${data.baseUrl}/auth/login`,
});

export const createEmailVerificationSuccessEmail = (data: EmailVerificationSuccessData): EmailResult => {
  const emailData = generateEmailVerificationSuccessData(data);
  const react = generateProfessionalEmail({ ...emailData, type: "verification" });
  const subject = "Welcome to Sequential Jobs";

  return { react, subject };
};

export const sendEmailVerificationSuccessEmail = async (data: EmailVerificationSuccessData): Promise<void> => {
  const { react, subject } = createEmailVerificationSuccessEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
