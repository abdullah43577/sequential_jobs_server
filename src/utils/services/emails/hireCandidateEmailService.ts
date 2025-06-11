import { generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface HireCandidateEmailData {
  email: string;
  recipientName: string;
  jobTitle: string;
  companyName: string;
  invitationLetter: string;
  dashboardUrl?: string;
}

interface EmailResult {
  html: string;
  subject: string;
}

const generateHireCandidateEmailData = (data: HireCandidateEmailData) => ({
  type: "hire" as const,
  title: "You're Hired!",
  recipientName: data.recipientName,
  message: `Congratulations! You have been selected for the ${data.jobTitle} position at ${data.companyName}. An official invitation letter has been issued, and you are required to upload the specified documents to complete your onboarding.\n\n${data.invitationLetter}`,
  buttonText: "View Offer Details",
  buttonAction: data.dashboardUrl || "http://localhost:8080/user/dashboard",
  additionalDetails: {
    organizerName: data.companyName,
  },
});

const createHireCandidateEmail = (data: HireCandidateEmailData): EmailResult => {
  const emailData = generateHireCandidateEmailData(data);
  const { html } = generateProfessionalEmail(emailData);
  const subject = `You're Hired! - ${data.jobTitle}`;

  return { html, subject };
};

export const sendHireCandidateEmail = async (data: HireCandidateEmailData): Promise<void> => {
  const { html, subject } = createHireCandidateEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
