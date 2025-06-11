import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface TestApplicantsData {
  email: string;
  first_name: string;
  last_name: string;
  job_title: string;
  invitation_letter: string;
  testLink: string;
  expirationDate: Date;
  organisation_name: string;
}

const generateTestApplicantsEmailData = (data: TestApplicantsData) => ({
  type: "test" as EmailTypes,
  title: "Job Assessment Invitation",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `You have been invited to complete a job assessment for the ${data.job_title} position. 
        Please click the button below to start the test. This invitation will expire on ${data.expirationDate.toLocaleDateString()}. \n\n ${data.invitation_letter}`,
  buttonText: "Start Assessment",
  buttonAction: data.testLink,
  additionalDetails: {
    date: data.expirationDate.toLocaleDateString(),
    time: "Open Until " + data.expirationDate.toLocaleTimeString(),
    organizerName: data.organisation_name,
  },
});

export const createTestApplicantsEmail = (data: TestApplicantsData) => {
  const emailData = generateTestApplicantsEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const subject = `Job Assessment Invitation - ${data.job_title}`;

  return { html: html.html, subject };
};

export const sendTestApplicantsEmail = async (data: TestApplicantsData) => {
  const { html, subject } = createTestApplicantsEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
