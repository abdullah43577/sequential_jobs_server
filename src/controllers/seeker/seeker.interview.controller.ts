import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import InterviewMgmt from "../../models/interview/interview.model";
import { scheduleInterviewSchema } from "../../utils/types/seekerValidatorSchema";
import Notification, { NotificationStatus, NotificationType } from "../../models/notifications.model";
import { transportMail } from "../../utils/nodemailer.ts/transportMail";
import { EmailTypes, generateProfessionalEmail } from "../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import User from "../../models/users.model";
import { getSocketIO } from "../../helper/socket";
import Job from "../../models/jobs/jobs.model";

//* INTERVIEW MANAGEMENT
const getJobsWithoutScheduledInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const interviews = await InterviewMgmt.find({
      "candidates.candidate": userId,
      "candidates.scheduled_date_time": { $exists: false },
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

    // Format the selected date and time for email
    const formattedDate = new Date(scheduled_date_time.date).toLocaleDateString();
    const timeSlot = `${scheduled_date_time.start_time} - ${scheduled_date_time.end_time}`;

    // Prepare email data
    const emailSubject = `Interview Scheduled: ${candidate.first_name} ${candidate.last_name} for ${interview.job.job_title} Position`;

    // 1. Send email to the employer
    const employerEmailData = {
      type: "interview" as EmailTypes,
      title: "Interview Scheduled",
      recipientName: `${interview.employer.first_name} ${interview.employer.last_name}`,
      message: `A candidate has scheduled an interview for the ${interview.job.job_title} position. Please find the details below:`,
      buttonText: "View Interview Details",
      buttonAction: `http://localhost:8080/interviews/${interview._id}`,
      additionalDetails: {
        candidate: `${candidate.first_name} ${candidate.last_name}`,
        date: formattedDate,
        time: timeSlot,
        meetingLink: interview.meetingLink,
      },
    };

    const { html: employerHtml } = generateProfessionalEmail(employerEmailData);

    // Send email to employer
    await transportMail({
      email: interview.employer.email,
      subject: emailSubject,
      message: employerHtml,
    });

    // Create notification for employer
    const employerNotification = await Notification.create({
      recipient: interview.employer._id,
      sender: userId,
      type: NotificationType.INTERVIEW,
      title: emailSubject,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled an interview for the ${interview.job.job_title} position on ${formattedDate} at ${timeSlot}.`,
      status: NotificationStatus.UNREAD,
    });

    // Send socket notification to employer
    const io = getSocketIO();
    io.to(interview.employer._id.toString()).emit("notification", {
      id: employerNotification._id,
      title: emailSubject,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled an interview for the ${interview.job.job_title} position.`,
      status: NotificationStatus.UNREAD,
      type: NotificationType.INTERVIEW,
      createdAt: employerNotification.createdAt,
    });

    // 2. Send emails to all panelists
    if (interview.panelists && interview.panelists.length > 0) {
      const panelistEmailPromises = interview.panelists.map(async panelistData => {
        try {
          // Try to find panelist in the database if you need their name
          const panelist = await User.findOne({ email: panelistData.email }).select("first_name last_name");
          const recipientName = panelist ? `${panelist.first_name} ${panelist.last_name}` : "Interview Panelist";

          const panelistEmailData = {
            type: "interview" as EmailTypes,
            title: "Interview Scheduled - Panelist Information",
            recipientName: recipientName,
            message: `A candidate interview has been scheduled for the ${interview.job.job_title} position at ${interview.employer.organisation_name}. 
            
As a panelist, you'll need to evaluate this candidate after the interview. Please keep the following reference information for your records:

Job ID: ${interview.job._id}
Candidate ID: ${userId}

You will need these IDs when submitting your candidate evaluation.`,
            buttonText: "Join Interview",
            buttonAction: interview.meetingLink,
            additionalDetails: {
              candidate: `${candidate.first_name} ${candidate.last_name}`,
              position: interview.job.job_title,
              date: formattedDate,
              time: timeSlot,
              organization: interview.employer.organisation_name,
              jobId: interview.job._id,
              candidateId: userId,
            },
          };

          const { html: panelistHtml } = generateProfessionalEmail(panelistEmailData);

          // Send email to panelist
          await transportMail({
            email: panelistData?.email,
            subject: emailSubject,
            message: panelistHtml,
          });

          return true;
        } catch (error) {
          console.error(`Error sending email to panelist ${panelistData.email}:`, error);
          return false;
        }
      });

      // Wait for all panelist emails to be sent
      await Promise.allSettled(panelistEmailPromises);
    }

    // 3. Send confirmation email to the candidate
    const candidateEmailData = {
      type: "interview" as EmailTypes,
      title: "Interview Confirmation",
      recipientName: `${candidate.first_name} ${candidate.last_name}`,
      message: `Your interview for the ${interview.job.job_title} position at ${interview.employer.organisation_name} has been scheduled. Please find the details below:`,
      buttonText: "Join Interview",
      buttonAction: interview.meetingLink,
      additionalDetails: {
        position: interview.job.job_title,
        company: interview.employer.organisation_name,
        date: formattedDate,
        time: timeSlot,
        meetingLink: interview.meetingLink,
        additionalInfo: "Please ensure you join the interview 5 minutes before the scheduled time. Have your resume and any relevant documents ready for reference.",
      },
    };

    const { html: candidateHtml } = generateProfessionalEmail(candidateEmailData);

    // Send confirmation email to candidate
    await transportMail({
      email: candidate.email,
      subject: `Interview Confirmation: ${interview.job.job_title} at ${interview.employer.organisation_name}`,
      message: candidateHtml,
    });

    //* update job status
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
      const candidate = interview.candidates.find(c => c.candidate.toString() === userId?.toString());

      return {
        company_name: interview.job.employer.organisation_name,
        job_title: interview.job.job_title,
        created_at: interview.job.createdAt,
        job_type: interview.job.job_type,
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
