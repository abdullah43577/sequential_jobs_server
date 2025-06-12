import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface MedicalistInviteData {
  firstName: string | undefined;
  jobTitle: string;
  email: string;
  tempPassword: string;
}

const generateMedicalistInviteEmailData = (data: MedicalistInviteData) => ({
  type: "invite" as EmailTypes,
  title: "You've Been Invited as a Medical Examiner",
  recipientName: data.firstName || "Guest",
  message: `You have been selected to conduct a medical examination for a candidate applying for the position of ${data.jobTitle}. Please click the button below to access the examination panel and review candidate details.
    
    Temporary Account Credentials:
    Email: ${data.email}
    Password: ${data.tempPassword}
    
    This account will expire in 7 days. Please change your password after first login.`,
  buttonText: "Access Examination Panel",
  buttonAction: `https://login?email=${encodeURIComponent(data.email)}&temp=true`,
  additionalDetails: {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    location: "Medical Evaluation (Virtual/In-person)",
    organizerName: "Sequential Jobs Medical Team",
  },
});

const createMedicalistInviteEmail = (data: MedicalistInviteData) => {
  const emailData = generateMedicalistInviteEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const subject = `Medical Examiner Invite - ${data.jobTitle}`;

  return { html: html.html, subject };
};

export const sendMedicalistInviteEmail = async (data: MedicalistInviteData) => {
  const { html, subject } = createMedicalistInviteEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
