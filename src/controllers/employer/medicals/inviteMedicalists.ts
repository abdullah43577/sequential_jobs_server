import crypto from "crypto";
import User from "../../../models/users.model";
import { hashPassword } from "../../../helper/hashPassword";
import { guessNameFromEmail } from "../../../utils/guessNameFromEmail";
import { EmailTypes, generateProfessionalEmail } from "../../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../../utils/nodemailer.ts/transportMail";

interface MedicalistInviteParams {
  email: string;
  jobTitle: string;
}

export const inviteMedicalist = async (params: MedicalistInviteParams) => {
  try {
    const { email, jobTitle } = params;

    const existingMedicalist = await User.findOne({ email }).lean();
    if (existingMedicalist) return true; // Already exists, no need to create

    const tempPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await hashPassword(tempPassword);
    const nameGuess = guessNameFromEmail(email);

    // Create new medicalist account
    const newMedicalist = await User.create({
      first_name: nameGuess.firstName || "Guest",
      last_name: "medicalist",
      email,
      password: hashedPassword,
      role: "medical-expert",
      isTemporary: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send invite email with credentials
    const emailData = {
      type: "invite" as EmailTypes,
      title: "You've Been Invited as a Medical Examiner",
      recipientName: nameGuess.firstName || "Guest",
      message: `You have been selected to conduct a medical examination for a candidate applying for the position of ${jobTitle}. Please click the button below to access the examination panel and review candidate details.

Temporary Account Credentials:
Email: ${email}
Password: ${tempPassword}

This account will expire in 7 days. Please change your password after first login.`,
      buttonText: "Access Examination Panel",
      buttonAction: `https://login?email=${encodeURIComponent(email)}&temp=true`,
      additionalDetails: {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        location: "Medical Evaluation (Virtual/In-person)",
        organizerName: "Sequential Jobs Medical Team",
      },
    };

    // Generate email HTML
    const { html } = generateProfessionalEmail(emailData);
    const subject = `Medical Examiner Invite - ${jobTitle}`;

    // Send email
    await transportMail({
      email,
      subject,
      message: html,
    });

    return true;
  } catch (error) {
    console.error(`Error inviting medicalist ${params.email}:`, error);
    return false;
  }
};

export const batchInviteMedicalists = async (emails: string[], jobTitle: string) => {
  const successfulInvites: string[] = [];

  await Promise.all(
    emails.map(async email => {
      const success = await inviteMedicalist({
        email,
        jobTitle,
      });

      if (success) {
        successfulInvites.push(email);
      }
    })
  );

  return successfulInvites;
};
