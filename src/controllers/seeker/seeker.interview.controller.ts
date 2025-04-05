import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import InterviewMgmt from "../../models/interview/interview.model";

//* INTERVIEW MANAGEMENT
const getJobsWithoutScheduledInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const interviews = await InterviewMgmt.find({
      "candidates.candidate": userId,
      "candidates.scheduled_date_time": { $exists: false },
    })
      .select("job")
      .populate<{
        job: {
          _id: string;
          job_title: string;
          created_at: string;
          job_type: string;
          employer: { _id: string; organisation_name: string };
        };
      }>({
        path: "job",
        select: "job_title created_at job_type employer", // ✅ Select fields from `job`
        populate: {
          path: "employer",
          select: "organisation_name", // ✅ Select fields from `employer`
        },
      });

    if (!interviews) return res.status(404).json({ message: "No Jobs Matching criteria found!" });

    const jobs = interviews.map(interview => ({ company_name: interview.job.employer.organisation_name, job_title: interview.job.job_title, created_at: interview.job.created_at, job_type: interview.job.job_type }));

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
    const { scheduled_date_time, job_id } = req.body;

    const interview = await InterviewMgmt.findOneAndUpdate(
      { job: job_id, "candidates.candidate": userId },
      {
        $set: {
          "candidates.$.scheduled_date_time": scheduled_date_time,
        },
      },
      { returnDocument: "after" }
    );

    if (!interview) return res.status(400).json({ message: "Interview Record not found!" });

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
      .select("job")
      .populate<{
        job: {
          _id: string;
          job_title: string;
          created_at: string;
          job_type: string;
          employer: { _id: string; organisation_name: string };
        };
      }>({
        path: "job",
        select: "job_title created_at job_type employer", // ✅ Select fields from `job`
        populate: {
          path: "employer",
          select: "organisation_name", // ✅ Select fields from `employer`
        },
      });

    if (!interviews) return res.status(404).json({ message: "No Jobs Matching criteria found!" });

    const jobs = interviews.map(interview => ({ company_name: interview.job.employer.organisation_name, job_title: interview.job.job_title, created_at: interview.job.created_at, job_type: interview.job.job_type }));

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithoutScheduledInterview, getInterviewInfo, scheduleInterview, getJobsWithScheduledInterview };
