import { Types } from "mongoose";
import { NotificationStatus, NotificationType } from "../../../models/notifications.model";
import User from "../../../models/users.model";
import { createAndSendNotification } from "../../../utils/services/notifications/sendNotification";
import { sendCandidateMedicalEmail } from "../../../utils/services/emails/candidateMedicalEmailInvite";

const { CLIENT_URL } = process.env;

interface CandidateInviteParams {
  candidateId: string | Types.ObjectId;
  medicalRecordId: string | Types.ObjectId;
  jobTitle: string;
  address: string;
  employerId: string | Types.ObjectId;
  employerOrgName: string;
}

export const sendCandidateMedicalInvite = async (params: CandidateInviteParams) => {
  try {
    const { candidateId, medicalRecordId, jobTitle, address, employerId, employerOrgName } = params;

    const candidate = await User.findById(candidateId);
    if (!candidate) return false;

    // Create invite link
    const medicalInviteLink = `${CLIENT_URL}/dashboard/job-seeker/medicals/schedule_medicals?job_id=/${medicalRecordId}`;
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days

    await sendCandidateMedicalEmail({ email: candidate.email, first_name: candidate.first_name, last_name: candidate.last_name, jobTitle, expirationDate, medicalInviteLink, address, employerOrgName });

    const subject = `Medical Assessment Invitation - ${jobTitle}`;

    // Create notification
    const message = `${employerOrgName} has invited you to schedule a medical assessment for ${jobTitle} position.`;

    await createAndSendNotification({ recipient: candidateId as any, sender: employerId as string, type: NotificationType.MESSAGE, title: subject, message, status: NotificationStatus.UNREAD });

    return true;
  } catch (error) {
    console.error(`Error sending medical invite to candidate ${params.candidateId}:`, error);
    return false;
  }
};

export const batchInviteCandidates = async (candidateIds: string[] | Types.ObjectId[], medicalRecordId: string | Types.ObjectId, jobTitle: string, address: string, employerId: string | Types.ObjectId, employerOrgName: string) => {
  const successfulInvites: string[] = [];

  await Promise.all(
    candidateIds.map(async candidateId => {
      const success = await sendCandidateMedicalInvite({
        candidateId,
        medicalRecordId,
        jobTitle,
        address,
        employerId,
        employerOrgName,
      });

      if (success) {
        successfulInvites.push(candidateId.toString());
      }
    })
  );

  return successfulInvites;
};
