import crypto from "crypto";
import User from "../../../models/users.model";
import { hashPassword } from "../../../helper/hashPassword";
import { guessNameFromEmail } from "../../../utils/guessNameFromEmail";
import { sendMedicalistInviteEmail } from "../../../utils/services/emails/medicalistInviteEmailService";

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

    await sendMedicalistInviteEmail({ firstName: nameGuess.firstName, jobTitle, email, tempPassword });

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
