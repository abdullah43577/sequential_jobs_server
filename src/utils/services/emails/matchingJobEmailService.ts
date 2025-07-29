import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface MatchingJobEmailData {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  organisation_name: string;
  btnUrl: string;
}

const generateMatchingJobEmailData = (data: MatchingJobEmailData) => ({
  type: "job_match" as EmailTypes,
  title: "🎯 Job Opportunity Just for You!",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `We found a job that aligns with your preferences! ${data.organisation_name} is hiring for the ${data.job_title} role.`,
  buttonText: "View Job & Apply",
  buttonAction: data.btnUrl,
  additionalDetails: {
    // You can extend this if needed
  },
});

const createMatchingJobEmail = (data: MatchingJobEmailData) => {
  const emailData = generateMatchingJobEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const subject = `🔥 New Job Match: ${data.job_title} at ${data.organisation_name}`;

  return { html: html.html, subject };
};

export const sendMatchingJobEmail = async (data: MatchingJobEmailData) => {
  const { html, subject } = createMatchingJobEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
