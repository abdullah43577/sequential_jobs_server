import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import InterviewMgmt from "../../models/interview/interview.model";
import { scheduleInterviewSchema } from "../../utils/types/seekerValidatorSchema";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";
import User from "../../models/users.model";
import Job from "../../models/jobs/jobs.model";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { queueBulkEmail } from "../../workers/globalEmailQueueHandler";
import { JOB_KEY } from "../../workers/registerWorkers";
import moment from "moment";

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
      .select("interview_time_slot job candidates")
      .populate<{ job: { job_title: string; employer: { organisation_name: string } } }>({
        path: "job",
        select: "job_title employer",
        populate: {
          path: "employer",
          select: "organisation_name",
        },
      })
      .lean();

    if (!interview_record) return res.status(404).json({ message: "Interview record not found!" });

    // Filter out booked slots from available_date_time
    const processedTimeSlots = interview_record.interview_time_slot.map(slot => {
      // Get all booked slots for this date
      const bookedSlots = interview_record.candidates
        .filter(candidate => candidate.scheduled_date_time && candidate.scheduled_date_time.date && moment(candidate.scheduled_date_time.date).format("YYYY-MM-DD") === moment(slot.date).format("YYYY-MM-DD"))
        .map(candidate => ({
          start_time: candidate.scheduled_date_time?.start_time,
          end_time: candidate.scheduled_date_time?.end_time,
        }));

      // Filter out booked slots from available slots
      const availableSlots = slot.available_date_time.filter(availableSlot => {
        return !bookedSlots.some(bookedSlot => bookedSlot.start_time === availableSlot.start_time && bookedSlot.end_time === availableSlot.end_time);
      });

      return {
        ...slot,
        available_date_time: availableSlots,
      };
    });

    const response = {
      ...interview_record,
      interview_time_slot: processedTimeSlots,
    };

    // Remove candidates array from response for security
    const { candidates, ...responseWithoutCandidates } = response;

    res.status(200).json(responseWithoutCandidates);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const scheduleInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { scheduled_date_time, job_id } = scheduleInterviewSchema.parse(req.body);

    // ✅ First, check if the slot is still available and remove it from available_date_time
    const interview = await InterviewMgmt.findOne({ job: job_id });
    if (!interview) return res.status(404).json({ message: "Interview Record not found!" });

    // Find the time slot that matches the selected date
    const timeSlotIndex = interview.interview_time_slot.findIndex(slot => moment(slot.date).format("YYYY-MM-DD") === moment(scheduled_date_time.date).format("YYYY-MM-DD"));

    if (timeSlotIndex === -1) {
      return res.status(400).json({ message: "Time slot not found for the selected date" });
    }

    // Check if the slot is still available
    const availableSlotIndex = interview.interview_time_slot[timeSlotIndex].available_date_time.findIndex(slot => slot.start_time === scheduled_date_time.start_time && slot.end_time === scheduled_date_time.end_time);

    if (availableSlotIndex === -1) {
      return res.status(400).json({ message: "Selected time slot is no longer available" });
    }

    // ✅ Remove the slot from available_date_time to prevent double booking
    interview.interview_time_slot[timeSlotIndex].available_date_time.splice(availableSlotIndex, 1);

    // ✅ Now update the candidate's scheduled time (your existing logic with modification)
    const updatedInterview = await InterviewMgmt.findOneAndUpdate(
      { job: job_id, "candidates.candidate": userId },
      {
        $set: {
          "candidates.$.scheduled_date_time": scheduled_date_time,
          "candidates.$.status": "confirmed",
          // ✅ Update the interview_time_slot with the modified available_date_time
          interview_time_slot: interview.interview_time_slot,
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

    if (!updatedInterview) {
      // ✅ If update fails, add the slot back to available_date_time
      interview.interview_time_slot[timeSlotIndex].available_date_time.push({
        start_time: scheduled_date_time.start_time,
        end_time: scheduled_date_time.end_time,
      });
      await interview.save();
      return res.status(404).json({ message: "Failed to update interview record" });
    }

    // Get candidate information
    const candidate = await User.findById(userId).select("first_name last_name email");
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // Get panelist information if they exist
    let panelists: { email: string; firstName: string | undefined; lastName: string | undefined }[] = [];

    if (updatedInterview.panelists && updatedInterview.panelists.length > 0) {
      const panelistPromises = updatedInterview.panelists.map(async email => {
        const panelist = await User.findOne({ email }).select("first_name last_name").lean();
        return {
          email,
          firstName: panelist?.first_name,
          lastName: panelist?.last_name,
        };
      });
      panelists = await Promise.all(panelistPromises);
    }

    // Prepare email data (your existing logic)
    const emailData = {
      candidate: {
        id: userId as string,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        email: candidate.email,
      },
      employer: {
        id: updatedInterview.employer._id,
        firstName: updatedInterview.employer.first_name,
        lastName: updatedInterview.employer.last_name,
        email: updatedInterview.employer.email,
        organisationName: updatedInterview.employer.organisation_name,
      },
      job: {
        id: updatedInterview.job._id,
        title: updatedInterview.job.job_title,
      },
      interview: {
        id: updatedInterview._id,
        meetingLink: updatedInterview.meetingLink,
      },
      scheduledDateTime: {
        date: scheduled_date_time.date,
        startTime: scheduled_date_time.start_time,
        endTime: scheduled_date_time.end_time,
      },
      baseUrl: CLIENT_URL as string,
    };

    const emailJobs = [
      { type: JOB_KEY.INTERVIEW_CANDIDATE_SCHEDULE_EMPLOYER_EMAIL, ...emailData },
      { type: JOB_KEY.INTERVIEW_CANDIDATE_SCHEDULE, ...emailData },
      ...panelists.map(panelist => ({
        type: JOB_KEY.INTERVIEW_CANDIDATE_SCHEDULE_PAHELISTS_EMAIL,
        ...emailData,
        // ✅ Flatten panelist data to top level
        panelistEmail: panelist.email,
        panelistFirstName: panelist.firstName,
        panelistLastName: panelist.lastName,
      })),
    ];

    // Schedule/send all interview emails
    await queueBulkEmail("CANDIDATE_INTERVIEW_SCHEDULED", emailJobs);

    // Create notification for employer
    const formattedDate = new Date(scheduled_date_time.date).toLocaleDateString();
    const timeSlot = `${scheduled_date_time.start_time} - ${scheduled_date_time.end_time}`;

    await createAndSendNotification({
      recipient: updatedInterview.employer._id as any,
      sender: userId as string,
      type: NotificationType.INTERVIEW,
      title: `Interview Scheduled: ${candidate.first_name} ${candidate.last_name} for ${updatedInterview.job.job_title} Position`,
      message: `${candidate.first_name} ${candidate.last_name} has scheduled an interview for the ${updatedInterview.job.job_title} position on ${formattedDate} at ${timeSlot}.`,
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
      interview: updatedInterview,
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
