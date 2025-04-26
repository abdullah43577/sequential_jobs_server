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
import { getBaseUrl } from "../../helper/getBaseUrl";

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
      .populate<{ job: { _id: string; job_title: string } }>({
        path: "job",
        select: "job_title",
      })
      .populate<{ employer: { _id: string; first_name: string; last_name: string; email: string; organisation_name: string } }>({
        path: "employer",
        select: "first_name last_name email organisation_name",
      });

    if (!medicals) return res.status(404).json({ message: "Medical record not found!" });

    // Get candidate information
    const candidate = await User.findById(userId).select("first_name last_name email");
    if (!candidate) return res.status(404).json({ message: "Candidate not found!" });

    // Format the selected date and time for email
    const formattedDate = new Date(scheduled_date_time.date).toLocaleDateString();
    const timeSlot = `${scheduled_date_time.start_time} - ${scheduled_date_time.end_time}`;

    // Prepare email data
    const emailSubject = `Medical Scheduled: ${candidate.first_name} ${candidate.last_name} for ${medicals.job.job_title} Position`;

    // 1. Send email to the employer
    const employerEmailData = {
      type: "medical" as EmailTypes,
      title: "Medical Appointment Scheduled",
      recipientName: `${medicals.employer.first_name} ${medicals.employer.last_name}`,
      message: `A candidate has scheduled a medical appointment for the ${medicals.job.job_title} position. Please find the details below:`,
      buttonText: "View Medical Details",
      buttonAction: `http://localhost:8080/medicals/${medicals._id}`,
      additionalDetails: {
        candidate: `${candidate.first_name} ${candidate.last_name}`,
        date: formattedDate,
        time: timeSlot,
        location: medicals.address,
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
      message: `${candidate.first_name} ${candidate.last_name} has scheduled a medical appointment for the ${medicals.job.job_title} position on ${formattedDate} at ${timeSlot}.`,
      status: NotificationStatus.UNREAD,
    });

    // Send socket notification to employer
    const io = getSocketIO();
    io.to(medicals.employer._id.toString()).emit("notification", {
      id: employerNotification._id,
      title: emailSubject,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled a medical appointment for the ${medicals.job.job_title} position.`,
      status: NotificationStatus.UNREAD,
      type: NotificationType.MEDICAL,
      createdAt: employerNotification.createdAt,
    });

    // 2. Send emails to all medical experts
    if (medicals.medicalists && medicals.medicalists.length > 0) {
      const medicalistEmailPromises = medicals.medicalists.map(async medicalistEmail => {
        try {
          // Try to find medical expert in the database if you need their name
          const medical_expert = await User.findOne({ email: medicalistEmail }).select("first_name last_name");
          const recipientName = medical_expert ? `${medical_expert.first_name} ${medical_expert.last_name}` : "Medical Expert";

          const medicalEmailData = {
            type: "medical" as EmailTypes,
            title: "Medical Appointment Scheduled - Expert Information",
            recipientName: recipientName,
            message: `A candidate medical appointment has been scheduled for the ${medicals.job.job_title} position at ${medicals.employer.organisation_name}. 
            
As a medical expert, you'll need to evaluate this candidate after the examination. Please keep the following reference information for your records:

Job ID: ${medicals.job._id}
Candidate ID: ${userId}

You will need these IDs when submitting your medical evaluation report.`,
            buttonText: "View Appointment Details",
            buttonAction: `http://localhost:8080/medicals/${medicals._id}`,
            additionalDetails: {
              candidate: `${candidate.first_name} ${candidate.last_name}`,
              position: medicals.job.job_title,
              date: formattedDate,
              time: timeSlot,
              location: medicals.address,
              organization: medicals.employer.organisation_name,
              jobId: medicals.job._id,
              candidateId: userId,
            },
          };

          const { html: medicalistHtml } = generateProfessionalEmail(medicalEmailData);

          // Send email to medical expert
          await transportMail({
            email: medicalistEmail,
            subject: emailSubject,
            message: medicalistHtml,
          });

          return true;
        } catch (error) {
          console.error(`Error sending email to medical expert ${medicalistEmail}:`, error);
          return false;
        }
      });

      // Wait for all medical expert emails to be sent
      await Promise.allSettled(medicalistEmailPromises);
    }

    // 3. Send confirmation email to the candidate
    const candidateEmailData = {
      type: "medical" as EmailTypes,
      title: "Medical Appointment Confirmation",
      recipientName: `${candidate.first_name} ${candidate.last_name}`,
      message: `Your medical appointment for the ${medicals.job.job_title} position at ${medicals.employer.organisation_name} has been scheduled. Please find the details below:`,
      buttonText: "View Appointment Details",
      buttonAction: `${getBaseUrl(req)}/extension/medicals/${medicals._id}`,
      additionalDetails: {
        position: medicals.job.job_title,
        company: medicals.employer.organisation_name,
        date: formattedDate,
        time: timeSlot,
        location: medicals.address,
        additionalInfo: "Please ensure you arrive at the medical facility 15 minutes before your scheduled time. Bring any previous medical records or information that might be relevant to your examination.",
      },
    };

    const { html: candidateHtml } = generateProfessionalEmail(candidateEmailData);

    // Send confirmation email to candidate
    await transportMail({
      email: candidate.email,
      subject: `Medical Appointment Confirmation: ${medicals.job.job_title} at ${medicals.employer.organisation_name}`,
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
      message: "Medical appointment scheduled successfully!",
      medicals,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithMedicals, getMedicalInfo, scheduleMedical };
