import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface ReuploadDocumentData {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  organisation_name: string;
  btnUrl: string;
}

const generateReuploadDocumentEmailData = (data: ReuploadDocumentData) => ({
  type: "document_reupload" as EmailTypes,
  title: "Documents Re-upload Request",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `${data.organisation_name} has requested that you re-upload the following documents for your application to the ${data.job_title} position:`,
  buttonText: "Upload Documents",
  buttonAction: data.btnUrl,
  additionalDetails: {
    // company: employer.organisation_name,
    // position: job.job_title,
    // documents: documentsList,
    // employerMessage: message || "Please re-upload the following documents.",
    // deadline: "As soon as possible to avoid delays in your application process.",
  },
});

const createReuploadDocumentEmail = (data: ReuploadDocumentData) => {
  const emailData = generateReuploadDocumentEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const subject = `Action Required: Re-upload Documents for ${data.job_title} Position`;

  return { html: html.html, subject };
};

export const sendReuploadDocumentEmail = async (data: ReuploadDocumentData) => {
  const { html, subject } = createReuploadDocumentEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
