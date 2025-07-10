import { generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface PanelistInviteData {
  email: string;
  recipientName: string;
  jobTitle: string;
  isNewPanelist: boolean;
  tempPassword?: string;
  isTemporary?: boolean;
}

interface EmailResult {
  html: string;
  subject: string;
}

const generateNewPanelistEmailData = (data: PanelistInviteData) => ({
  type: "invite" as const,
  title: "You've Been Selected as an Interview Panelist",
  recipientName: data.recipientName,
  message: `You have been selected as a panelist for upcoming candidate interviews for the position of ${data.jobTitle}.
    
  When candidates schedule their interviews, you will receive follow-up emails with specific details including the job ID and candidate ID you'll need when submitting candidate evaluations.
  
  ${data.isTemporary && data.tempPassword ? `\n\nTemporary Account Credentials:\nEmail: ${data.email}\nPassword: ${data.tempPassword}\n\nThis account will expire in 7 days. Please change your password after first login.` : ""}`,
  buttonText: "Access Interview Panel",
  buttonAction: "https://sequentialjobs.com/auth/login",
  additionalDetails: {
    location: "Virtual Interview",
    organizerName: "Sequential Jobs Team",
  },
});

const generateExistingPanelistEmailData = (data: PanelistInviteData) => ({
  type: "invite" as const,
  title: "Interview Panel Notification",
  recipientName: data.recipientName,
  message: `You have been added as a panelist for upcoming candidate interviews for the position of ${data.jobTitle}.
    
  When candidates schedule their interviews, you will receive follow-up emails with specific details including the job ID and candidate ID you'll need when submitting candidate evaluations.
  
  Please use your existing account credentials to access the interview panel.`,
  buttonText: "Access Interview Panel",
  buttonAction: "https://sequentialjobs.com/auth/login",
  additionalDetails: {
    location: "Virtual Interview",
    organizerName: "Sequential Jobs Team",
  },
});

export const createPanelistInviteEmail = (data: PanelistInviteData): EmailResult => {
  const emailData = data.isNewPanelist ? generateNewPanelistEmailData(data) : generateExistingPanelistEmailData(data);

  const { html } = generateProfessionalEmail(emailData);

  const subject = data.isNewPanelist ? `Panelist Selection - ${data.jobTitle}` : `Panel Notification - ${data.jobTitle}`;

  return { html, subject };
};

export const sendPanelistInviteEmail = async (data: PanelistInviteData) => {
  const { html, subject } = createPanelistInviteEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
