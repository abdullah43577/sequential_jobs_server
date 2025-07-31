import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface UpgradeConfirmationEmailData {
  email: string;
  first_name: string;
  last_name: string;
  plan_name: string;
  btnUrl: string;
}

const generateUpgradeConfirmationEmailData = (data: UpgradeConfirmationEmailData) => ({
  type: "upgrade_confirmation" as EmailTypes,
  title: "🎉 You've Been Upgraded!",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Congratulations! Your subscription has been upgraded to the <strong>${data.plan_name}</strong> plan. Enjoy the premium features tailored just for you.`,
  buttonText: "Explore Your Benefits",
  buttonAction: data.btnUrl,
  additionalDetails: {},
});

const createUpgradeConfirmationEmail = (data: UpgradeConfirmationEmailData) => {
  const emailData = generateUpgradeConfirmationEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `🚀 You're Now on the ${data.plan_name} Plan!`;

  return { react, subject };
};

export const sendUpgradeConfirmationEmail = async (data: UpgradeConfirmationEmailData) => {
  const { react, subject } = createUpgradeConfirmationEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
