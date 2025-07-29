import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface CandidateMedicalData {
  email: string;
  first_name: string;
  last_name: string;
  jobTitle: string;
  expirationDate: Date;
  medicalInviteLink: string;
  address: string;
  employerOrgName: string;
}

const generateCandidateMedicalEmailData = (data: CandidateMedicalData) => {
  const expirationDate = new Date(data.expirationDate);

  return {
    type: "invite" as EmailTypes,
    title: "Medical Assessment Invitation",
    recipientName: `${data.first_name} ${data.last_name}`,
    message: `You have been invited to schedule a medical assessment for the ${data.jobTitle} position. 
      Please click the button below to schedule your medical assessment. This invitation will expire on ${expirationDate.toLocaleDateString()}.`,
    buttonText: "Schedule Medical Assessment",
    buttonAction: data.medicalInviteLink,
    additionalDetails: {
      date: expirationDate.toLocaleDateString(),
      time: "Open Until " + expirationDate.toLocaleTimeString(),
      location: data.address,
      organizerName: data.employerOrgName,
    },
  };
};

export const createCandidateMedicalEmail = (data: CandidateMedicalData) => {
  const emailData = generateCandidateMedicalEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const subject = `Medical Assessment Invitation - ${data.jobTitle}`;

  return { html: html.html, subject };
};

export const sendCandidateMedicalEmail = async (data: CandidateMedicalData) => {
  const { html, subject } = createCandidateMedicalEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
