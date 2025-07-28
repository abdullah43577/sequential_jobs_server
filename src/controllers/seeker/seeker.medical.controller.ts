import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import MedicalMgmt from "../../models/medicals/medical.model";
import { scheduleInterviewSchema } from "../../utils/types/seekerValidatorSchema";
import User from "../../models/users.model";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";
import Job from "../../models/jobs/jobs.model";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { JOB_KEY } from "../../workers/registerWorkers";
import { queueBulkEmail } from "../../workers/globalEmailQueueHandler";

const { CLIENT_URL } = process.env;

const getJobsWithMedicals = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const medicals = await MedicalMgmt.find({
      candidates: {
        $elemMatch: {
          candidate: userId,
          $or: [{ scheduled_date_time: {} }, { scheduled_date_time: null }, { scheduled_date_time: { $exists: false } }],
        },
      },
    })
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

    console.log("medicalss", medicals);

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
    ).populate<{ job: { _id: string; employer: { _id: string; first_name: string; last_name: string; email: string; organisation_name: string }; job_title: string } }>({
      path: "job",
      select: "employer job_title",
      populate: {
        path: "employer",
        select: "first_name last_name email organisation_name",
      },
    });

    if (!medicals) return res.status(404).json({ message: "Medical record not found!" });

    // Get candidate information
    const candidate = await User.findById(userId).select("first_name last_name email");
    if (!candidate) return res.status(404).json({ message: "Candidate not found!" });

    // Extract employer information from the job
    const employer = medicals.job.employer;

    // Get medical expert information if they exist
    let medicalExperts: { email: string; firstName: string | undefined; lastName: string | undefined }[] = [];
    if (medicals.medicalists && medicals.medicalists.length > 0) {
      const expertPromises = medicals.medicalists.map(async expertEmail => {
        const expert = await User.findOne({ email: expertEmail }).select("first_name last_name");
        return {
          email: expertEmail,
          firstName: expert?.first_name,
          lastName: expert?.last_name,
        };
      });
      medicalExperts = await Promise.all(expertPromises);
    }

    // Prepare email data
    const emailData = {
      candidate: {
        id: userId as string,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
      },
      employer: {
        id: employer._id,
        firstName: employer.first_name,
        lastName: employer.last_name,
        email: employer.email,
        organisationName: employer.organisation_name,
      },
      job: {
        id: medicals.job._id,
        title: medicals.job.job_title,
      },
      medical: {
        id: medicals._id,
        address: medicals.address,
      },
      scheduledDateTime: {
        date: scheduled_date_time.date,
        startTime: scheduled_date_time.start_time,
        endTime: scheduled_date_time.end_time,
      },
      baseUrl: CLIENT_URL as string,
    };

    const emailJobs = [
      { type: JOB_KEY.MEDICALIST_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL, ...emailData },
      { type: JOB_KEY.MEDICALIST_CANDIDATE_SCHEDULE, ...emailData },
      ...medicalExperts.map(medic => ({
        type: JOB_KEY.MEDICALIST_CANDIDATE_SCHEDULE_MEDICALISTS_EMAIL,
        ...emailData,
        // ✅ Flatten panelist data to top level
        medicalistEmail: medic.email,
        medicalistFirstName: medic.firstName,
        medicalistLastName: medic.lastName,
      })),
    ];

    await queueBulkEmail("CANDIDATE_MEDICAL_SCHEDULED", emailJobs);

    // Create notification for employer
    const formattedDate = new Date(scheduled_date_time.date).toLocaleDateString();
    const timeSlot = `${scheduled_date_time.start_time} - ${scheduled_date_time.end_time}`;

    await createAndSendNotification({
      recipient: employer._id as any,
      sender: userId as string,
      type: NotificationType.MEDICAL,
      title: `Medical Scheduled: ${candidate.first_name} ${candidate.last_name} for ${medicals.job.job_title} Position`,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled a medical appointment for the ${medicals.job.job_title} position on ${formattedDate} at ${timeSlot}.`,
      status: NotificationStatus.UNREAD,
    });

    // Update job status
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

const getJobsWithScheduledMedicals = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const medicals = await MedicalMgmt.find({
      "candidates.candidate": userId,
      "candidates.scheduled_date_time": { $exists: true },
    })
      .select("job candidates address")
      .populate<{
        job: {
          _id: string;
          job_title: string;
          updatedAt: string;
          job_type: string;
          employer: { _id: string; organisation_name: string };
        };
      }>({
        path: "job",
        select: "job_title updatedAt job_type employer",
        populate: {
          path: "employer",
          select: "organisation_name",
        },
      });

    if (!medicals || medicals.length === 0) return res.status(200).json([]);

    const jobs = medicals.map(medical => {
      const candidate = medical.candidates.find(c => c.candidate.toString() === userId?.toString());

      return {
        company_name: medical.job.employer.organisation_name,
        job_title: medical.job.job_title,
        updated_at: medical.job.updatedAt,
        job_type: medical.job.job_type,
        has_attended_medical: candidate?.status === "completed",
        scheduled_date_time: candidate?.scheduled_date_time,
        medical_location: medical.address,
      };
    });

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithMedicals, getMedicalInfo, scheduleMedical, getJobsWithScheduledMedicals };
