import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface TrialExpiredEmailData {
  email: string;
  first_name: string;
  last_name: string;
  btnUrl: string;
}

const generateTrialExpiredEmailData = (data: TrialExpiredEmailData) => ({
  type: "trial_expired" as EmailTypes,
  title: "⚠️ Your Trial Has Ended",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Your free trial period has ended, and your account has been downgraded to the Sequential Freemium plan. You still have access to basic features, but to continue enjoying premium benefits, consider upgrading your subscription.`,
  buttonText: "Upgrade Now",
  buttonAction: data.btnUrl,
  additionalDetails: {},
});

const createTrialExpiredEmail = (data: TrialExpiredEmailData) => {
  const emailData = generateTrialExpiredEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `⏳ Trial Expired – Downgraded to Sequential Freemium`;

  return { react, subject };
};

export const sendTrialExpiredEmail = async (data: TrialExpiredEmailData) => {
  const { react, subject } = createTrialExpiredEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
