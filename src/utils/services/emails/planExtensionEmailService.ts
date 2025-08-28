import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface ExtensionConfirmationEmailData {
  email: string;
  first_name: string;
  last_name: string;
  plan_name: string;
  new_expiry: string; // formatted date string
  grace_period_days?: number; // optional
}

const generateExtensionConfirmationEmailData = (data: ExtensionConfirmationEmailData) => ({
  type: "extension_confirmation" as EmailTypes,
  title: data.grace_period_days ? "Grace Period Extended" : "Subscription Extended",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: data.grace_period_days
    ? `Your grace period for the <strong>${data.plan_name}</strong> plan has been extended by <strong>${data.grace_period_days} days</strong>. You now have until <strong>${data.new_expiry}</strong> to renew your subscription.`
    : `Your <strong>${data.plan_name}</strong> subscription has been extended until <strong>${data.new_expiry}</strong>. Enjoy uninterrupted access to premium features.`,
  additionalDetails: {},
});

const createExtensionConfirmationEmail = (data: ExtensionConfirmationEmailData) => {
  const emailData = generateExtensionConfirmationEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = emailData.title;

  return { react, subject };
};

export const sendExtensionConfirmationEmail = async (data: ExtensionConfirmationEmailData) => {
  const { react, subject } = createExtensionConfirmationEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
