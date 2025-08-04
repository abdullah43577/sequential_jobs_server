import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

const { CLIENT_URL } = process.env;

export interface MedicalSubmissionEmailData {
  email: string;
  candidateName: string;
  jobTitle: string;
  job_id: string;
  documentLinks: Record<string, string>; // filename: url
}

interface EmailResult {
  react: any;
  subject: string;
}

const generateMedicalSubmissionEmailData = (data: MedicalSubmissionEmailData) => ({
  type: "notification" as EmailTypes,
  title: `Medical Record Submitted`,
  recipientName: data.candidateName,
  message: `This is to notify you that <strong>${data.candidateName}</strong> has submitted their medical documents for the role of <strong>${data.jobTitle}</strong>. Please review the documents and proceed with the next stage of the recruitment process.`,

  buttonText: "View Medical Records",
  buttonAction: `${CLIENT_URL}/dashboard/company/medicals/view_medical_candidates?job_id=${data.job_id}`,
  additionalContent: Object.entries(data.documentLinks)
    .map(([filename, url]) => `<li><a href="${url}" target="_blank">${filename}</a></li>`)
    .join(""),
});

export const createMedicalSubmissionEmail = (data: MedicalSubmissionEmailData): EmailResult => {
  const emailData = generateMedicalSubmissionEmailData(data);

  const react = generateProfessionalEmail({
    ...emailData,
    message: `${emailData.message}<br/><br/><strong>Submitted Documents:</strong><ul>${emailData.additionalContent}</ul>`,
  });

  const subject = `Medical Record Submitted for ${data.candidateName}`;

  return { react, subject };
};

export const sendMedicalSubmissionEmail = async (data: MedicalSubmissionEmailData): Promise<void> => {
  const { react, subject } = createMedicalSubmissionEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
