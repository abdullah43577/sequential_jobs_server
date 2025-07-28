import { generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface CandidateInviteData {
  email: string;
  recipientName: string;
  jobTitle: string;
  isTemporary?: boolean;
}

interface EmailResult {
  html: string;
  subject: string;
}

const generateCandidateInviteEmailData = (data: CandidateInviteData) => ({
  type: "invite" as const,
  title: "You've Been Invited for an Interview",
  recipientName: data.recipientName,
  message: `You have been invited for an upcoming interview for the position of ${data.jobTitle}. Please click the button below to access the interview panel and set your available date and time.`,
  buttonText: "Access Interview Panel",
  buttonAction: `https://login?email=${encodeURIComponent(data.email)}${data.isTemporary ? "&temp=true" : ""}`,
  additionalDetails: {
    date: "formattedDate",
    time: "formattedTime",
    location: "Virtual Interview",
    organizerName: "Sequential Jobs Team",
  },
});

export const createCandidateInviteEmail = (data: CandidateInviteData): EmailResult => {
  const emailData = generateCandidateInviteEmailData(data);
  const { html } = generateProfessionalEmail(emailData);
  const subject = `Candidate Interview Invite - ${data.jobTitle}`;

  return { html, subject };
};

export const sendCandidateInviteEmail = async (data: CandidateInviteData): Promise<void> => {
  const { html, subject } = createCandidateInviteEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
