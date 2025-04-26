import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import MedicalMgmt from "../../models/medicals/medical.model";
import { scheduleInterviewSchema } from "../../utils/types/seekerValidatorSchema";
import User from "../../models/users.model";
import { EmailTypes, generateProfessionalEmail } from "../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../utils/nodemailer.ts/transportMail";
import { getSocketIO } from "../../helper/socket";
import Notification, { NotificationStatus, NotificationType } from "../../models/notifications.model";
import Job from "../../models/jobs/jobs.model";

const getJobsWithMedicals = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const medicals = await MedicalMgmt.find({ "candidates.candidate": userId, "candidates.scheduled_date_time": { $exists: false } })
      .select("job candidates")
      .populate<{
        job: {
          _id: string;
          job_title: string;
          createdAt: string;
          job_type: string;
          employer: { _id: string; organisation_name: string };
        };
      }>({
        path: "job",
        select: "job_title createdAt job_type employer",
        populate: {
          path: "employer",
          select: "organisation_name",
        },
      });

    if (!medicals) return res.status(404).json({ message: "No Jobs matching criteria found!" });

    const jobs = medicals.map(medical => {
      const candidate = medical.candidates.find(c => c.candidate.toString() === userId?.toString());

      const is_medical_scheduled = candidate?.scheduled_date_time && Object.keys(candidate.scheduled_date_time).length > 0;

      return {
        job_id: medical.job._id,
        company_name: medical.job.employer.organisation_name,
        job_title: medical.job.job_title,
        createdAt: medical.job.createdAt,
        job_type: medical.job.job_type,
        is_medical_scheduled: !!is_medical_scheduled,
      };
    });

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getMedicalInfo = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;

    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    const medical_record = await MedicalMgmt.findOne({ job: job_id })
      .select("medical_time_slot job")
      .populate<{ job: { job_title: string; employer: { organisation_name: string } } }>({
        path: "job",
        select: "job_title employer",
        populate: {
          path: "employer",
          select: "organisation_name",
        },
      });

    if (!medical_record) return res.status(404).json({ message: "Medical record not found!" });

    res.status(200).json(medical_record);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const scheduleMedical = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { scheduled_date_time, job_id } = scheduleInterviewSchema.parse(req.body);

    const medicals = await MedicalMgmt.findOneAndUpdate(
      {
        job: job_id,
        "candidates.candidate": userId,
      },
      {
        $set: {
          "candidates.$.scheduled_date_time": scheduled_date_time,
          "candidates.$.status": "confirmed",
        },
      },
      { returnDocument: "after" }
    )
      .populate<{ job: { job_title: string } }>("job", "job_title")
      .populate<{ employer: { _id: string; first_name: string; last_name: string; email: string; organisation_name: string } }>("employer", "first_name last_name email organisation_name");

    if (!medicals) return res.status(404).json({ message: "Medical record not found!" });

    // Get candidate information
    const candidate = await User.findById(userId).select("first_name last_name email").lean();

    if (!candidate) return res.status(404).json({ message: "Candidate not found!" });

    // Format the selected date and time for email
    const formattedDate = new Date(scheduled_date_time.date).toLocaleDateString();
    const timeSlot = `${scheduled_date_time.start_time} - ${scheduled_date_time.end_time}`;

    // Prepare email data
    const emailSubject = `Medical Scheduled: ${candidate.first_name} ${candidate.last_name} for ${medicals.job.job_title} Position`;

    //1. Send email to the employer
    const employerEmailData = {
      type: "medicals" as EmailTypes,
      title: "Medicals Scheduled",
      recipientName: `${medicals.employer.first_name} ${medicals.employer.last_name}`,
      message: `A candidate has scheduled a medical interview for the ${medicals.job.job_title} position. Please find the details below:`,
      buttonText: "View Interview Details",
      buttonAction: `http://localhost:8080/interviews/${medicals._id}`,
      additionalDetails: {
        candidate: `${candidate.first_name} ${candidate.last_name}`,
        date: formattedDate,
        time: timeSlot,
        // meetingLink: interview.meetingLink,
      },
    };

    const { html: employerHtml } = generateProfessionalEmail(employerEmailData);

    // Send email to employer
    await transportMail({
      email: medicals.employer.email,
      subject: emailSubject,
      message: employerHtml,
    });

    // Create notification for employer
    const employerNotification = await Notification.create({
      recipient: medicals.employer._id,
      sender: userId,
      type: NotificationType.MEDICAL,
      title: emailSubject,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled a medical interview for the ${medicals.job.job_title} position on ${formattedDate} at ${timeSlot}.`,
      status: NotificationStatus.UNREAD,
    });

    // Send socket notification to employer
    const io = getSocketIO();
    io.to(medicals.employer._id.toString()).emit("notification", {
      id: employerNotification._id,
      title: emailSubject,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled an interview for the ${medicals.job.job_title} position.`,
      status: NotificationStatus.UNREAD,
      type: NotificationType.INTERVIEW,
      createdAt: employerNotification.createdAt,
    });

    // 2. Send emails to all medical experts
    if (medicals.medicalists && medicals.medicalists.length > 0) {
      const panelistEmailPromises = medicals.medicalists.map(async medicalistEmail => {
        try {
          // Try to find medical expert in the database if you need their name
          const medical_expert = await User.findOne({ email: medicalistEmail }).select("first_name last_name");

          const recipientName = medical_expert ? `${medical_expert.first_name} ${medical_expert.last_name}` : "Interview Panelist";

          const medicalEmailData = {
            type: "medical" as EmailTypes,
            title: "Medical Scheduled",
            recipientName: recipientName,
            message: `A candidate interview has been scheduled for the ${medicals.job.job_title} position at ${medicals.employer.organisation_name}. Please find the details below:`,
            buttonText: "Join Interview",
            buttonAction: "Join",
            additionalDetails: {
              candidate: `${candidate.first_name} ${candidate.last_name}`,
              position: medicals.job.job_title,
              date: formattedDate,
              time: timeSlot,
              organization: medicals.employer.organisation_name,
            },
          };

          const { html: panelistHtml } = generateProfessionalEmail(medicalEmailData);

          // Send email to panelist
          await transportMail({
            email: medicalistEmail,
            subject: emailSubject,
            message: panelistHtml,
          });

          return true;
        } catch (error) {
          console.error(`Error sending email to panelist ${medicalistEmail}:`, error);
          return false;
        }
      });

      // Wait for all panelist emails to be sent
      await Promise.allSettled(panelistEmailPromises);
    }

    // 3. Send confirmation email to the candidate
    const candidateEmailData = {
      type: "medical" as EmailTypes,
      title: "Medical Confirmation",
      recipientName: `${candidate.first_name} ${candidate.last_name}`,
      message: `Your interview for the ${medicals.job.job_title} position at ${medicals.employer.organisation_name} has been scheduled. Please find the details below:`,
      buttonText: "Join medicals",
      buttonAction: "Medical Text",
      additionalDetails: {
        position: medicals.job.job_title,
        company: medicals.employer.organisation_name,
        date: formattedDate,
        time: timeSlot,
        // meetingLink: medicals.meetingLink,
        // additionalInfo: "Please ensure you join the interview 5 minutes before the scheduled time. Have your resume and any relevant documents ready for reference.",
      },
    };

    const { html: candidateHtml } = generateProfessionalEmail(candidateEmailData);

    // Send confirmation email to candidate
    await transportMail({
      email: candidate.email,
      subject: `Medical Confirmation: ${medicals.job.job_title} at ${medicals.employer.organisation_name}`,
      message: candidateHtml,
    });

    //* update job status
    await Job.findOneAndUpdate(
      { _id: job_id, "applicants.applicant": userId },
      {
        $set: {
          "applicants.$.status": "medical_scheduled",
        },
      }
    );

    res.status(200).json({
      message: "Interview scheduled successfully!",
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithMedicals, getMedicalInfo, scheduleMedical };
