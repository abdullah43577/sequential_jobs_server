import { Types } from "mongoose";
import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface InterviewEmailData {
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  employer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organisationName: string;
  };
  job: {
    id: string;
    title: string;
  };
  interview: {
    id: Types.ObjectId;
    meetingLink: string;
  };
  scheduledDateTime: {
    date: string;
    startTime: string;
    endTime: string;
  };
  baseUrl: string;
}

export interface PanelistData {
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
}

// Generate employer email data
const generateEmployerEmailData = (data: InterviewEmailData) => {
  const formattedDate = new Date(data.scheduledDateTime.date).toLocaleDateString();
  const timeSlot = `${data.scheduledDateTime.startTime} - ${data.scheduledDateTime.endTime}`;

  return {
    type: "interview" as EmailTypes,
    title: "Interview Scheduled",
    recipientName: `${data.employer.firstName} ${data.employer.lastName}`,
    message: `A candidate has scheduled an interview for the ${data.job.title} position. Please find the details below:`,
    buttonText: "View Interview Details",
    buttonAction: `${data.baseUrl}/dashboard/company/interview-management/${data.interview.id}`,
    additionalDetails: {
      candidate: `${data.candidate.firstName} ${data.candidate.lastName}`,
      date: formattedDate,
      time: timeSlot,
      meetingLink: data.interview.meetingLink,
    },
  };
};

// Generate panelist email data
const generatePanelistEmailData = (data: InterviewEmailData, panelist: PanelistData) => {
  const formattedDate = new Date(data.scheduledDateTime.date).toLocaleDateString();
  const timeSlot = `${data.scheduledDateTime.startTime} - ${data.scheduledDateTime.endTime}`;
  const recipientName = panelist.firstName && panelist.lastName ? `${panelist.firstName} ${panelist.lastName}` : "Interview Panelist";

  return {
    type: "interview" as EmailTypes,
    title: "Interview Scheduled - Panelist Information",
    recipientName: recipientName,
    message: `A candidate interview has been scheduled for the ${data.job.title} position at ${data.employer.organisationName}. 
    
As a panelist, you'll need to evaluate this candidate after the interview. Please keep the following reference information for your records:

Job ID: ${data.job.id}
Candidate ID: ${data.candidate.id}

You will need these IDs when submitting your candidate evaluation.`,
    buttonText: "Join Interview",
    buttonAction: data.interview.meetingLink,
    additionalDetails: {
      candidate: `${data.candidate.firstName} ${data.candidate.lastName}`,
      position: data.job.title,
      date: formattedDate,
      time: timeSlot,
      organization: data.employer.organisationName,
      jobId: data.job.id,
      candidateId: data.candidate.id,
    },
  };
};

// Generate candidate email data
const generateCandidateEmailData = (data: InterviewEmailData) => {
  const formattedDate = new Date(data.scheduledDateTime.date).toLocaleDateString();
  const timeSlot = `${data.scheduledDateTime.startTime} - ${data.scheduledDateTime.endTime}`;

  return {
    type: "interview" as EmailTypes,
    title: "Interview Confirmation",
    recipientName: `${data.candidate.firstName} ${data.candidate.lastName}`,
    message: `Your interview for the ${data.job.title} position at ${data.employer.organisationName} has been scheduled. Please find the details below:`,
    buttonText: "Join Interview",
    buttonAction: data.interview.meetingLink,
    additionalDetails: {
      position: data.job.title,
      company: data.employer.organisationName,
      date: formattedDate,
      time: timeSlot,
      meetingLink: data.interview.meetingLink,
      additionalInfo: "Please ensure you join the interview 5 minutes before the scheduled time. Have your resume and any relevant documents ready for reference.",
    },
  };
};

// Create employer email
const createEmployerEmail = (data: InterviewEmailData) => {
  const emailData = generateEmployerEmailData(data);
  const { html } = generateProfessionalEmail(emailData);
  const subject = `Interview Scheduled: ${data.candidate.firstName} ${data.candidate.lastName} for ${data.job.title} Position`;

  return { html, subject };
};

// Create panelist email
const createPanelistEmail = (data: InterviewEmailData, panelist: PanelistData) => {
  const emailData = generatePanelistEmailData(data, panelist);
  const { html } = generateProfessionalEmail(emailData);
  const subject = `Interview Scheduled: ${data.candidate.firstName} ${data.candidate.lastName} for ${data.job.title} Position`;

  return { html, subject };
};

// Create candidate email
const createCandidateEmail = (data: InterviewEmailData) => {
  const emailData = generateCandidateEmailData(data);
  const { html } = generateProfessionalEmail(emailData);
  const subject = `Interview Confirmation: ${data.job.title} at ${data.employer.organisationName}`;

  return { html, subject };
};

// Send employer email
export const sendEmployerInterviewEmail = async (data: InterviewEmailData) => {
  const { html, subject } = createEmployerEmail(data);

  await transportMail({
    email: data.employer.email,
    subject,
    message: html,
  });
};

// Send panelist email
export const sendPanelistInterviewEmail = async (data: InterviewEmailData, panelist: PanelistData) => {
  const { html, subject } = createPanelistEmail(data, panelist);

  await transportMail({
    email: panelist.email,
    subject,
    message: html,
  });
};

// Send candidate email
export const sendCandidateInterviewEmail = async (data: InterviewEmailData) => {
  const { html, subject } = createCandidateEmail(data);

  await transportMail({
    email: data.candidate.email,
    subject,
    message: html,
  });
};
