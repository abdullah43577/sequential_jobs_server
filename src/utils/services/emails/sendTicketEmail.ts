import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface TicketCreatedEmailData {
  email: string;
  first_name: string;
  last_name: string;
  ticket_title: string;
  ticketId: string;
  btnUrl: string;
}

const generateTicketCreatedEmailData = (data: TicketCreatedEmailData) => ({
  type: "ticket_created" as EmailTypes,
  title: "✅ Your Ticket Has Been Submitted",
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Your support ticket titled "${data.ticket_title}" has been received. Your Ticket ID is **${data.ticketId}**. Our support team will respond shortly.`,
  buttonText: "View Ticket",
  buttonAction: data.btnUrl,
  additionalDetails: {},
});

const createTicketCreatedEmail = (data: TicketCreatedEmailData) => {
  const emailData = generateTicketCreatedEmailData(data);
  const react = generateProfessionalEmail(emailData);
  const subject = `📩 Ticket Received: ${data.ticket_title} [ID: ${data.ticketId}]`;

  return { react, subject };
};

export const sendTicketCreatedEmail = async (data: TicketCreatedEmailData) => {
  const { react, subject } = createTicketCreatedEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: react,
  });
};
