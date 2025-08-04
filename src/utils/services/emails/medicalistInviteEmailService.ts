import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface MedicalistInviteData {
  email: string;
  recipientName: string;
  jobTitle: string;
  isNewMedicalist: boolean;
  tempPassword?: string;
  isTemporary?: boolean;
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateNewMedicalistEmailData = (data: MedicalistInviteData) => ({
  type: "invite" as EmailTypes,
  title: "You've Been Selected as a Medical Examiner",
  recipientName: data.recipientName,
  message: `You have been selected to conduct medical examinations for candidates applying for the position of ${data.jobTitle}.
    
When candidates schedule their medical examinations, you will receive follow-up emails with specific details including the job ID and candidate ID you'll need when submitting medical evaluations.

${data.isTemporary && data.tempPassword ? `\n\nTemporary Account Credentials:\nEmail: ${data.email}\nPassword: ${data.tempPassword}\n\nThis account will expire in 7 days. Please change your password after first login.` : ""}`,
  buttonText: "Access Medical Panel",
  buttonAction: "https://sequentialjobs.com/auth/login",
  additionalDetails: {
    location: "Medical Evaluation Center",
    organizerName: "Sequential Jobs Medical Team",
  },
});

const generateExistingMedicalistEmailData = (data: MedicalistInviteData) => ({
  type: "invite" as EmailTypes,
  title: "Medical Examination Assignment",
  recipientName: data.recipientName,
  message: `You have been assigned to conduct medical examinations for candidates applying for the position of ${data.jobTitle}.
    
When candidates schedule their medical examinations, you will receive follow-up emails with specific details including the job ID and candidate ID you'll need when submitting medical evaluations.

Please use your existing account credentials to access the medical examination panel.`,
  buttonText: "Access Medical Panel",
  buttonAction: "https://sequentialjobs.com/auth/login",
  additionalDetails: {
    location: "Medical Evaluation Center",
    organizerName: "Sequential Jobs Medical Team",
  },
});

export const createMedicalistInviteEmail = (data: MedicalistInviteData): EmailResult => {
  const emailData = data.isNewMedicalist ? generateNewMedicalistEmailData(data) : generateExistingMedicalistEmailData(data);

  const react = generateProfessionalEmail(emailData);

  const subject = data.isNewMedicalist ? `Medical Examiner Selection - ${data.jobTitle}` : `Medical Assignment - ${data.jobTitle}`;

  return { react, subject };
};

export const sendMedicalistInviteEmail = async (data: MedicalistInviteData) => {
  const { react, subject } = createMedicalistInviteEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
