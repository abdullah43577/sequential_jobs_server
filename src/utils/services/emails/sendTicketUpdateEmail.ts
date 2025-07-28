import { EmailTypes, generateProfessionalEmail } from "../../nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../nodemailer.ts/transportMail";

export interface TicketUpdateEmailData {
  email: string;
  first_name: string;
  last_name: string;
  ticket_title: string;
  ticketId: string;
  status: string;
  message: string;
  btnUrl: string;
}

const generateTicketUpdateEmailData = (data: TicketUpdateEmailData) => ({
  type: "ticket_update" as EmailTypes,
  title: `📌 Ticket Update: ${data.ticket_title}`,
  recipientName: `${data.first_name} ${data.last_name}`,
  message: `Your support ticket **${data.ticketId}** has been updated to **${data.status}** status.\n\n**Message from Support:**\n${data.message}`,
  buttonText: "View Ticket",
  buttonAction: data.btnUrl,
  additionalDetails: {},
});

const createTicketUpdateEmail = (data: TicketUpdateEmailData) => {
  const emailData = generateTicketUpdateEmailData(data);
  const html = generateProfessionalEmail(emailData);
  const subject = `🔔 Ticket Update: ${data.ticket_title} [${data.ticketId}] - ${data.status}`;

  return { html: html.html, subject };
};

export const sendTicketUpdateEmail = async (data: TicketUpdateEmailData) => {
  const { html, subject } = createTicketUpdateEmail(data);

  await transportMail({
    email: data.email,
    subject,
    message: html,
  });
};
