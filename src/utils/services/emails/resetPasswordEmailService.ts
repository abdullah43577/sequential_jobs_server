import { registrationEmail } from "../../nodemailer.ts/email-templates/registration-email";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface ResetPasswordData {
  email: string;
  first_name: string;
}

const generateResetPasswordEmailData = (data: ResetPasswordData) => ({
  title: "Your Password Has Been Reset",
  name: data.first_name,
  message:
    "Your password for your Sequential Jobs account has been successfully reset. If you made this change, you can safely ignore this message.\n\nIf you did not request this change, please contact our support team immediately at support@sequentialjobs.com.",
  btnTxt: "Contact Support",
  btnAction: "mailto:support@sequentialjobs.com",
});

export const createResetPasswordEmail = (data: ResetPasswordData) => {
  const emailData = generateResetPasswordEmailData(data);
  const html = registrationEmail(emailData);
  const subject = "Your Password Has Been Reset";

  return { html: html.html, subject };
};

export const sendResetPasswordEmail = async (data: ResetPasswordData) => {
  const { html, subject } = createResetPasswordEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
