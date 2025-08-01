import { generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface ResetPasswordData {
  email: string;
  first_name: string;
}

const generateResetPasswordEmailData = (data: ResetPasswordData) => ({
  title: "Your Password Has Been Reset",
  recipientName: data.first_name,
  message:
    "Your password for your Sequential Jobs account has been successfully reset. If you made this change, you can safely ignore this message.\n\nIf you did not request this change, please contact our support team immediately at support@sequentialjobs.com.",
  buttonText: "Contact Support",
  buttonAction: "mailto:support@sequentialjobs.com",
});

export const createResetPasswordEmail = (data: ResetPasswordData) => {
  const emailData = generateResetPasswordEmailData(data);
  const react = generateProfessionalEmail({ ...emailData, type: "verification" });
  const subject = "Your Password Has Been Reset";

  return { react, subject };
};

export const sendResetPasswordEmail = async (data: ResetPasswordData) => {
  const { react, subject } = createResetPasswordEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
