import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import InterviewMgmt from "../models/interview/interview.model";
import JobTest from "../models/assessment/jobtest.model";
import MedicalMgmt from "../models/medicals/medical.model";

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

const getSeekerEvents = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    // Interview events
    const interviews = await InterviewMgmt.find({
      "candidates.candidate": userId,
      "candidates.status": { $in: ["pending", "confirmed"] },
    })
      .populate<{ employer: { _id: string; organisation_name: string } }>("employer", "organisation_name")
      .populate<{ job: { _id: string; job_title: string } }>("job", "job_title")
      .lean();

    const interviewEvents = interviews
      .flatMap(interview =>
        interview.candidates
          .filter(candidate => String(candidate.candidate) === userId)
          .map(candidate => ({
            type: "interview",
            event_id: interview._id,
            description: `Interview with ${interview.employer.organisation_name} for the position of ${interview.job?.job_title}`,
            scheduled_date_time: candidate.scheduled_date_time ?? null,
            duration: `${candidate.scheduled_date_time?.start_time} - ${candidate.scheduled_date_time?.end_time}`,
            organisation_name: interview.employer.organisation_name,
            has_attended: candidate.status === "completed",
          }))
      )
      .filter(event => Object.values(event.scheduled_date_time || {}).length > 0);

    // Medical events
    const medicals = await MedicalMgmt.find({
      "candidates.candidate": userId,
      "candidates.status": { $in: ["pending", "confirmed"] },
    })
      .populate<{ job: { employer: { _id: string; organisation_name: string }; job_title: string } }>({
        path: "job",
        select: "employer job_title",
        populate: {
          path: "employer",
          select: "organisation_name",
        },
      })
      .lean();

    const medicalEvents = medicals
      .flatMap(medical =>
        medical.candidates
          .filter(candidate => String(candidate.candidate) === userId)
          .map(candidate => ({
            type: "medical",
            event_id: medical._id,
            description: `Medical assessment for ${medical.job.job_title} at ${medical.job.employer.organisation_name}`,
            scheduled_date_time: candidate.scheduled_date_time ?? null,
            duration: `${candidate.scheduled_date_time?.start_time} - ${candidate.scheduled_date_time?.end_time}`,
            organisation_name: medical.job.employer.organisation_name,
            has_attended: candidate.status === "completed",
          }))
      )
      .filter(event => Object.values(event.scheduled_date_time || {}).length > 0);

    const events = [...interviewEvents, ...medicalEvents];

    res.status(200).json(events);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getEmployerEvents, getSeekerEvents };
