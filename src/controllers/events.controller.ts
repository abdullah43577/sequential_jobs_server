import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import InterviewMgmt from "../models/interview/interview.model";

const getEmployerEvents = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const interviews = await InterviewMgmt.find({ employer: userId })
      .populate<{ employer: { _id: string; organisation_name: string } }>("employer", "organisation_name")
      .populate<{ job: { _id: string; job_title: string } }>("job", "job_title")
      .lean();

    const events = interviews
      .flatMap(interview =>
        interview.candidates.map(candidate => ({
          interview_id: interview._id,
          description: `Interview with ${interview.employer.organisation_name} for the position of ${interview.job.job_title}`,
          scheduled_date_time: candidate.scheduled_date_time ?? null,
          duration: `${candidate.scheduled_date_time?.start_time} - ${candidate.scheduled_date_time?.end_time}`,
          organisation_name: interview.employer.organisation_name,
          has_attended_interview: candidate.status === "completed",
        }))
      )
      .filter(event => Object.values(event.scheduled_date_time || {}).length > 0);

    res.status(200).json(events);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getEmployerEvents };
