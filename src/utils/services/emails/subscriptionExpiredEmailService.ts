import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface SubscriptionExpiredEmailData {
  email: string;
  first_name: string;
  last_name: string;
  previousTier: string;
  btnUrl: string;
}

const generateSubscriptionExpiredEmailData = (data: SubscriptionExpiredEmailData) => ({
  type: "subscription_expired" as EmailTypes,
  title: "💳 Subscription Expired",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Your ${data.previousTier} subscription has expired and your account has been downgraded to the Sequential Freemium plan. You still have access to basic features, but to restore your premium benefits and continue enjoying advanced features, please renew your subscription.`,
  buttonText: "Reactivate Subscription",
  buttonAction: data.btnUrl,
  additionalDetails: {
    // previousTier: data.previousTier,
    // currentTier: "Sequential Freemium",
  },
});

const createSubscriptionExpiredEmail = (data: SubscriptionExpiredEmailData) => {
  const emailData = generateSubscriptionExpiredEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `💳 ${data.previousTier} Subscription Expired – Downgraded to Freemium`;

  return { react, subject };
};

export const sendSubscriptionExpiredEmail = async (data: SubscriptionExpiredEmailData) => {
  const { react, subject } = createSubscriptionExpiredEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
