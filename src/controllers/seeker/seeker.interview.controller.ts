import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import InterviewMgmt from "../../models/interview/interview.model";
import { scheduleInterviewSchema } from "../../utils/types/seekerValidatorSchema";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";

import User from "../../models/users.model";
import Job from "../../models/jobs/jobs.model";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { sendAllInterviewEmails } from "../../utils/services/emails/scheduleInterviewEmailService";

const { CLIENT_URL } = process.env;

//* INTERVIEW MANAGEMENT
const getJobsWithoutScheduledInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const interviews = await InterviewMgmt.find({
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

    console.log(interviews, "interviews here for job seeker");

    if (!interviews) return res.status(404).json({ message: "No Jobs Matching criteria found!" });

    const jobs = interviews.map(interview => {
      const candidate = interview.candidates.find(c => c.candidate.toString() === userId?.toString());

      const is_interview_scheduled = candidate?.scheduled_date_time && Object.keys(candidate.scheduled_date_time).length > 0;

      return { job_id: interview.job._id, company_name: interview.job.employer.organisation_name, job_title: interview.job.job_title, created_at: interview.job.createdAt, job_type: interview.job.job_type, is_interview_scheduled };
    });

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getInterviewInfo = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;

    const interview_record = await InterviewMgmt.findOne({ job: job_id })
      .select("interview_time_slot job")
      .populate<{ job: { job_title: string; employer: { organisation_name: string } } }>({
        path: "job",
        select: "job_title employer",
        populate: {
          path: "employer",
          select: "organisation_name",
        },
      });
    if (!interview_record) return res.status(404).json({ message: "Interview record not found!" });

    res.status(200).json(interview_record);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const scheduleInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { scheduled_date_time, job_id } = scheduleInterviewSchema.parse(req.body);

    const interview = await InterviewMgmt.findOneAndUpdate(
      { job: job_id, "candidates.candidate": userId },
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

    if (!interview) return res.status(404).json({ message: "Interview Record not found!" });

    // Get candidate information
    const candidate = await User.findById(userId).select("first_name last_name email");
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // Get panelist information if they exist
    let panelists: { email: string; firstName: string | undefined; lastName: string | undefined }[] = [];

    console.log(interview, "interview data here");

    if (interview.panelists && interview.panelists.length > 0) {
      const panelistPromises = interview.panelists.map(async panelistData => {
        const panelist = await User.findOne({ email: panelistData.email }).select("first_name last_name");
        console.log(panelist, "panelist fetched data is here");
        return {
          email: panelistData.email,
          firstName: panelist?.first_name,
          lastName: panelist?.last_name,
        };
      });
      panelists = await Promise.all(panelistPromises);
      console.log(panelists, "panelists data");
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
        id: interview.employer._id,
        firstName: interview.employer.first_name,
        lastName: interview.employer.last_name,
        email: interview.employer.email,
        organisationName: interview.employer.organisation_name,
      },
      job: {
        id: interview.job._id,
        title: interview.job.job_title,
      },
      interview: {
        id: interview._id,
        meetingLink: interview.meetingLink,
      },
      scheduledDateTime: {
        date: scheduled_date_time.date,
        startTime: scheduled_date_time.start_time,
        endTime: scheduled_date_time.end_time,
      },
      baseUrl: CLIENT_URL as string,
    };

    // Send all interview emails
    await sendAllInterviewEmails(emailData, panelists);

    // Create notification for employer
    const formattedDate = new Date(scheduled_date_time.date).toLocaleDateString();
    const timeSlot = `${scheduled_date_time.start_time} - ${scheduled_date_time.end_time}`;

    await createAndSendNotification({
      recipient: interview.employer._id as any,
      sender: userId as string,
      type: NotificationType.INTERVIEW,
      title: `Interview Scheduled: ${candidate.first_name} ${candidate.last_name} for ${interview.job.job_title} Position`,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled an interview for the ${interview.job.job_title} position on ${formattedDate} at ${timeSlot}.`,
      status: NotificationStatus.UNREAD,
    });

    // Update job status
    await Job.findOneAndUpdate(
      { _id: job_id, "applicants.applicant": userId },
      {
        $set: {
          "applicants.$.status": "interview_scheduled",
        },
      }
    );

    res.status(200).json({
      message: "Interview scheduled successfully!",
      interview,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobsWithScheduledInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const interviews = await InterviewMgmt.find({
      "candidates.candidate": userId,
      "candidates.scheduled_date_time": { $exists: true },
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

    if (!interviews) return res.status(404).json({ message: "No Jobs Matching criteria found!" });

    const jobs = interviews.map(interview => {
      const candidate = interview.candidates.find(c => c?.candidate?.toString() === userId?.toString());

      return {
        company_name: interview?.job?.employer?.organisation_name,
        job_title: interview?.job?.job_title,
        created_at: interview?.job?.createdAt,
        job_type: interview?.job?.job_type,
        has_attended_interview: candidate?.status,
        scheduled_date_time: candidate?.scheduled_date_time,
      };
    });

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithoutScheduledInterview, getInterviewInfo, scheduleInterview, getJobsWithScheduledInterview };
