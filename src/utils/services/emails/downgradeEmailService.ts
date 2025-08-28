import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface DowngradeConfirmationEmailData {
  email: string;
  first_name: string;
  last_name: string;
  old_plan: string;
  new_plan: string;
}

const generateDowngradeConfirmationEmailData = (data: DowngradeConfirmationEmailData) => ({
  type: "downgrade_confirmation" as EmailTypes,
  title: "Your Subscription Has Been Downgraded",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Your subscription has been changed from <strong>${data.old_plan}</strong> to <strong>${data.new_plan}</strong>. If you have any questions or need assistance, please contact support.`,
  additionalDetails: {},
});

const createDowngradeConfirmationEmail = (data: DowngradeConfirmationEmailData) => {
  const emailData = generateDowngradeConfirmationEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `Your Plan Has Been Downgraded to ${data.new_plan}`;

  return { react, subject };
};

export const sendDowngradeConfirmationEmail = async (data: DowngradeConfirmationEmailData) => {
  const { react, subject } = createDowngradeConfirmationEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
