import { registrationEmail } from "../../nodemailer.ts/email-templates/registration-email";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface EmailVerificationSuccessData {
  email: string;
  firstName: string;
  baseUrl: string;
}

interface EmailResult {
  html: string;
  subject: string;
}

const generateEmailVerificationSuccessData = (data: EmailVerificationSuccessData) => ({
  title: "Email Verified Successfully!",
  name: data.firstName,
  message: "Your email has been successfully verified. You can now log in to your account and start exploring.",
  btnTxt: "Login",
  btnAction: `${data.baseUrl}/auth/login`,
});

export const createEmailVerificationSuccessEmail = (data: EmailVerificationSuccessData): EmailResult => {
  const emailData = generateEmailVerificationSuccessData(data);
  const html = registrationEmail(emailData);
  const subject = "Welcome to Sequential Jobs";

  return { html: html.html, subject };
};

export const sendEmailVerificationSuccessEmail = async (data: EmailVerificationSuccessData): Promise<void> => {
  const { html, subject } = createEmailVerificationSuccessEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
