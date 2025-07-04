import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface TestSubmissionNotificationData {
  employer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  candidate: {
    firstName: string;
    lastName: string;
  };
  job: {
    title: string;
  };
  test: {
    title: string;
    type: "job_test" | "application_test";
  };
  submission: {
    id: string;
    score: number;
    totalQuestions: number;
  };
  baseUrl: string;
}

interface EmailResult {
  html: string;
  subject: string;
}

const generateTestSubmissionNotificationData = (data: TestSubmissionNotificationData) => {
  const testTypeLabel = data.test.type === "job_test" ? "Job Assessment" : "Application Test";
  const scorePercentage = data.submission.totalQuestions > 0 ? Math.round((data.submission.score / data.submission.totalQuestions) * 100) : 0;

  return {
    type: "test_submission" as EmailTypes,
    title: `${testTypeLabel} Completed`,
    recipientName: `${data.employer.firstName} ${data.employer.lastName}`,
    message: `${data.candidate.firstName} ${data.candidate.lastName} has completed the ${testTypeLabel.toLowerCase()} for the ${data.job.title} position. Please review their performance below.`,
    buttonText: "View Test Results",
    buttonAction: `${data.baseUrl}/test-submissions/${data.submission.id}`,
    // additionalDetails: {
    //   candidate: `${data.candidate.firstName} ${data.candidate.lastName}`,
    //   position: data.job.title,
    //   testTitle: data.test.title,
    //   score: `${data.submission.score} points (${scorePercentage}%)`,
    //   totalQuestions: `${data.submission.totalQuestions} questions`,
    //   testType: testTypeLabel,
    // },
  };
};

export const createTestSubmissionNotificationEmail = (data: TestSubmissionNotificationData): EmailResult => {
  const emailData = generateTestSubmissionNotificationData(data);
  const { html } = generateProfessionalEmail(emailData);
  const testTypeLabel = data.test.type === "job_test" ? "Job Assessment" : "Application Test";
  const subject = `${testTypeLabel} Completed: ${data.candidate.firstName} ${data.candidate.lastName} - ${data.job.title}`;

  return { html, subject };
};

export const sendTestSubmissionNotificationEmail = async (data: TestSubmissionNotificationData) => {
  const { html, subject } = createTestSubmissionNotificationEmail(data);

  await transportMail({
    email: data.employer.email,
    subject,
    message: html,
  });
};
