import { generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface ForgotPasswordData {
  email: string;
  first_name: string;
  baseUrl: string;
  resetToken: string;
}

const generateForgotPasswordEmailData = (data: ForgotPasswordData) => ({
  title: "Reset Your Password",
  recipientName: data.first_name,
  message: "We received a request to reset your password for your Sequential Jobs account. Click the button below to set a new password. \n\n Reset token expires in 10 minutes \n\n If you didn’t request this, you can safely ignore this email.",
  buttonText: "Reset Password",
  buttonAction: `${data.baseUrl}/auth/reset-password?token=${data.resetToken}`,
});

export const createForgotPasswordEmail = (data: ForgotPasswordData) => {
  const emailData = generateForgotPasswordEmailData(data);
  const react = generateProfessionalEmail({ ...emailData, type: "verification" });
  const subject = "Reset Your Password";

  return { react, subject };
};

export const sendForgotPasswordEmail = async (data: ForgotPasswordData) => {
  const { react, subject } = createForgotPasswordEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
