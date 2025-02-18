import "dotenv/config";
import nodemailer from "nodemailer";
import { transportMail } from "../types/types";

const { NODEMAILER_EMAIL, NODEMAILER_PASSWORD } = process.env;

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: NODEMAILER_EMAIL,
    pass: NODEMAILER_PASSWORD,
  },
});

export async function transportMail(formData: transportMail) {
  try {
    const info = await transporter.sendMail({
      from: NODEMAILER_EMAIL,
      to: formData.email,
      subject: formData.subject,
      html: formData.message,
    });
    return info;
  } catch (error) {
    throw error;
  }
}
