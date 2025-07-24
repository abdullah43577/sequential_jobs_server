import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface GracePeriodEmailData {
  email: string;
  first_name: string;
  last_name: string;
  graceEndDate: Date;
  btnUrl: string;
}

const generateGracePeriodEmailData = (data: GracePeriodEmailData) => {
  const daysLeft = Math.ceil((data.graceEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return {
    type: "grace_period_notification" as EmailTypes,
    title: "⏰ Grace Period Active - Renew Soon",
    recipientName: `${data.first_name} ${data.last_name}`,
    message: `Your subscription has expired, but you're currently in a grace period that ends on ${data.graceEndDate.toLocaleDateString()}. You have ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left to renew your subscription and maintain uninterrupted access to all premium features.`,
    buttonText: "Renew Subscription",
    buttonAction: data.btnUrl,
    additionalDetails: {
      //   graceEndDate: data.graceEndDate.toLocaleDateString(),
      //   daysRemaining: daysLeft.toString(),
    },
  };
};

const createGracePeriodEmail = (data: GracePeriodEmailData) => {
  const emailData = generateGracePeriodEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const daysLeft = Math.ceil((data.graceEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const subject = `⏰ Grace Period: ${daysLeft} ${daysLeft === 1 ? "Day" : "Days"} Left to Renew`;

  return { html: html.html, subject };
};

export const sendGracePeriodNotificationEmail = async (data: GracePeriodEmailData) => {
  const { html, subject } = createGracePeriodEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
