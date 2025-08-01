import "dotenv/config";
import { Resend } from "resend";

export interface transportMailType {
  email: string;
  subject: string;
  message: any;
}

const { SENDER_EMAIL, REPLYTO_EMAIL, RESEND_API_KEY } = process.env;

const resend = new Resend(RESEND_API_KEY);

export async function transportMail(formData: transportMailType) {
  try {
    const info = await resend.emails.send({
      from: SENDER_EMAIL as string,
      to: [formData.email],
      subject: formData.subject,
      // html: formData.message,
      react: formData.message,
      replyTo: REPLYTO_EMAIL,
    });
    return info;
  } catch (error) {
    throw error;
  }
}
