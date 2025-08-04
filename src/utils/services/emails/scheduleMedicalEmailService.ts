import { Types } from "mongoose";
import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface MedicalEmailData {
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
  medical: {
    id: Types.ObjectId;
    address: string;
  };
  scheduledDateTime: {
    date: string;
    startTime: string;
    endTime: string;
  };
  baseUrl: string;
}

interface MedicalExpertData {
  email: string;
  firstName?: string | undefined;
  lastName?: string | undefined;
}

// Generate employer email data
const generateEmployerMedicalEmailData = (data: MedicalEmailData) => {
  const formattedDate = new Date(data.scheduledDateTime.date).toLocaleDateString();
  const timeSlot = `${data.scheduledDateTime.startTime} - ${data.scheduledDateTime.endTime}`;

  return {
    type: "medical" as EmailTypes,
    title: "Medical Appointment Scheduled",
    recipientName: `${data.employer.firstName} ${data.employer.lastName}`,
    message: `A candidate has scheduled a medical appointment for the ${data.job.title} position. Please find the details below:`,
    buttonText: "View Medical Details",
    buttonAction: `${data.baseUrl}/medicals/${data.medical.id}`,
    additionalDetails: {
      candidate: `${data.candidate.firstName} ${data.candidate.lastName}`,
      date: formattedDate,
      time: timeSlot,
      location: data.medical.address,
    },
  };
};

// Generate medical expert email data
const generateMedicalExpertEmailData = (data: MedicalEmailData, expert: MedicalExpertData) => {
  const formattedDate = new Date(data.scheduledDateTime.date).toLocaleDateString();
  const timeSlot = `${data.scheduledDateTime.startTime} - ${data.scheduledDateTime.endTime}`;
  const recipientName = expert.firstName && expert.lastName ? `${expert.firstName} ${expert.lastName}` : "Medical Expert";

  return {
    type: "medical" as EmailTypes,
    title: "Medical Appointment Scheduled - Expert Information",
    recipientName: recipientName,
    message: `A candidate medical appointment has been scheduled for the ${data.job.title} position at ${data.employer.organisationName}. 
    
As a medical expert, you'll need to evaluate this candidate after the examination. Please keep the following reference information for your records:

Job ID: ${data.job.id}
Candidate ID: ${data.candidate.id}

You will need these IDs when submitting your medical evaluation report.`,
    buttonText: "View Appointment Details",
    buttonAction: `${data.baseUrl}/medicals/${data.medical.id}`,
    additionalDetails: {
      candidate: `${data.candidate.firstName} ${data.candidate.lastName}`,
      position: data.job.title,
      date: formattedDate,
      time: timeSlot,
      location: data.medical.address,
      organization: data.employer.organisationName,
      jobId: data.job.id,
      candidateId: data.candidate.id,
    },
  };
};

// Generate candidate email data
const generateCandidateMedicalEmailData = (data: MedicalEmailData) => {
  const formattedDate = new Date(data.scheduledDateTime.date).toLocaleDateString();
  const timeSlot = `${data.scheduledDateTime.startTime} - ${data.scheduledDateTime.endTime}`;

  return {
    type: "medical" as EmailTypes,
    title: "Medical Appointment Confirmation",
    recipientName: `${data.candidate.firstName} ${data.candidate.lastName}`,
    message: `Your medical appointment for the ${data.job.title} position at ${data.employer.organisationName} has been scheduled. Please find the details below:`,
    buttonText: "View Appointment Details",
    buttonAction: `${data.baseUrl}/extension/medicals/${data.medical.id}`,
    additionalDetails: {
      position: data.job.title,
      company: data.employer.organisationName,
      date: formattedDate,
      time: timeSlot,
      location: data.medical.address,
      additionalInfo: "Please ensure you arrive at the medical facility 15 minutes before your scheduled time. Bring any previous medical records or information that might be relevant to your examination.",
    },
  };
};

// Create employer email
const createEmployerMedicalEmail = (data: MedicalEmailData) => {
  const emailData = generateEmployerMedicalEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `Medical Scheduled: ${data.candidate.firstName} ${data.candidate.lastName} for ${data.job.title} Position`;

  return { react, subject };
};

// Create medical expert email
const createMedicalExpertEmail = (data: MedicalEmailData, expert: MedicalExpertData) => {
  const emailData = generateMedicalExpertEmailData(data, expert);
  const react = generateProfessionalEmail(emailData);
  const subject = `Medical Scheduled: ${data.candidate.firstName} ${data.candidate.lastName} for ${data.job.title} Position`;

  return { react, subject };
};

// Create candidate email
const createCandidateMedicalEmail = (data: MedicalEmailData) => {
  const emailData = generateCandidateMedicalEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `Medical Appointment Confirmation: ${data.job.title} at ${data.employer.organisationName}`;

  return { react, subject };
};

// Send employer email
export const sendEmployerMedicalEmail = async (data: MedicalEmailData) => {
  const { react, subject } = createEmployerMedicalEmail(data);

  await transportMail({
    email: data.employer.email,
    subject,
    message: react,
  });
};

// Send medical expert email
export const sendMedicalExpertEmail = async (data: MedicalEmailData, expert: MedicalExpertData) => {
  const { react, subject } = createMedicalExpertEmail(data, expert);

  await transportMail({
    email: expert.email,
    subject,
    message: react,
  });
};

// Send candidate email
export const sendCandidateMedicalEmail = async (data: MedicalEmailData) => {
  const { react, subject } = createCandidateMedicalEmail(data);

  await transportMail({
    email: data.candidate.email,
    subject,
    message: react,
  });
};
