import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

interface ResumeReminderEmailData {
  email: string;
  first_name: string;
  last_name: string;
  btnUrl: string;
}

const generateResumeReminderEmailData = (data: ResumeReminderEmailData) => ({
  type: "resume_reminder" as EmailTypes,
  title: "📄 Complete Your Profile - Upload Your Resume",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `You're almost there! Uploading your resume will boost your chances of getting hired and help us match you with better opportunities.`,
  buttonText: "Upload Resume",
  buttonAction: data.btnUrl,
  additionalDetails: {
    // Extend if necessary
  },
});

const createResumeReminderEmail = (data: ResumeReminderEmailData) => {
  const emailData = generateResumeReminderEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `⏳ Don't Miss Out - Complete Your Profile Today`;

  return { react, subject };
};

export const sendResumeReminderEmail = async (data: ResumeReminderEmailData) => {
  const { react, subject } = createResumeReminderEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
