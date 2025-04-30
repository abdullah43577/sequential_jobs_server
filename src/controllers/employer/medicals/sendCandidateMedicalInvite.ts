import { Types } from "mongoose";
import { getSocketIO } from "../../../helper/socket";
import Notification, { NotificationStatus, NotificationType } from "../../../models/notifications.model";
import User from "../../../models/users.model";
import { EmailTypes, generateProfessionalEmail } from "../../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../../utils/nodemailer.ts/transportMail";

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
    const medicalInviteLink = `http://localhost:8080/medical-scheduling/${medicalRecordId}`;
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days

    // Prepare email data
    const emailTemplateData = {
      type: "invite" as EmailTypes,
      title: "Medical Assessment Invitation",
      recipientName: `${candidate.first_name} ${candidate.last_name}`,
      message: `You have been invited to schedule a medical assessment for the ${jobTitle} position. 
      Please click the button below to schedule your medical assessment. This invitation will expire on ${expirationDate.toLocaleDateString()}.`,
      buttonText: "Schedule Medical Assessment",
      buttonAction: medicalInviteLink,
      additionalDetails: {
        date: expirationDate.toLocaleDateString(),
        time: "Open Until " + expirationDate.toLocaleTimeString(),
        location: address,
        organizerName: employerOrgName,
      },
    };

    // Generate email HTML
    const { html } = generateProfessionalEmail(emailTemplateData);
    const subject = `Medical Assessment Invitation - ${jobTitle}`;

    // Send email
    await transportMail({
      email: candidate.email,
      subject,
      message: html,
    });

    // Create notification
    const message = `${employerOrgName} has invited you to schedule a medical assessment for ${jobTitle} position.`;

    const notification = await Notification.create({
      recipient: candidateId,
      sender: employerId,
      type: NotificationType.MESSAGE,
      title: subject,
      message,
      status: NotificationStatus.UNREAD,
    });

    // Send socket notification
    const io = getSocketIO();
    io.to(candidateId.toString()).emit("notification", {
      id: notification._id,
      title: subject,
      message,
      status: NotificationStatus.UNREAD,
      type: NotificationType.MESSAGE,
      createdAt: notification.createdAt,
    });

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
