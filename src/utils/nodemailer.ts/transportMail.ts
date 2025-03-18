import "dotenv/config";
import nodemailer from "nodemailer";

export interface transportMailType {
  email: string;
  subject: string;
  message: any;
}

const { NODEMAILER_EMAIL, NODEMAILER_PASSWORD, NODEMAILER_REPLYTO_EMAIL } = process.env;

console.log(NODEMAILER_EMAIL, NODEMAILER_PASSWORD, NODEMAILER_REPLYTO_EMAIL);

const transporter = nodemailer.createTransport({
  host: "smtp.ipage.com",
  port: 465,
  secure: true,
  auth: {
    user: NODEMAILER_EMAIL,
    pass: NODEMAILER_PASSWORD,
  },
});

export async function transportMail(formData: transportMailType) {
  try {
    const info = await transporter.sendMail({
      from: NODEMAILER_EMAIL,
      to: formData.email,
      subject: formData.subject,
      html: formData.message,
      replyTo: NODEMAILER_REPLYTO_EMAIL,
    });
    return info;
  } catch (error) {
    throw error;
  }
}
