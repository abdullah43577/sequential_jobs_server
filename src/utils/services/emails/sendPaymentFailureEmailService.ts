import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface PaymentFailureEmailData {
  email: string;
  first_name: string;
  last_name: string;
  plan_name: string;
  btnUrl: string;
}

const generatePaymentFailureEmailData = (data: PaymentFailureEmailData) => ({
  type: "payment_failure" as EmailTypes,
  title: "⚠️ Payment Failed",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Unfortunately, your recent payment for the <strong>${data.plan_name}</strong> plan failed. Please update your payment method to continue enjoying uninterrupted service.`,
  buttonText: "Update Payment Method",
  buttonAction: data.btnUrl,
  additionalDetails: {},
});

const createPaymentFailureEmail = (data: PaymentFailureEmailData) => {
  const emailData = generatePaymentFailureEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `⚠️ Action Required: Payment for ${data.plan_name} Failed`;

  return { react, subject };
};

export const sendPaymentFailureEmail = async (data: PaymentFailureEmailData) => {
  const { react, subject } = createPaymentFailureEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
