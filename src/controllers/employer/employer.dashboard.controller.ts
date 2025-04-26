import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import TestSubmission from "../../models/jobs/testsubmission.model";
import Test from "../../models/jobs/test.model";

const TotalApplicantsTable = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId })
      .select("job_title applicants application_test")
      .populate<{ applicants: { applicant: { _id: string; first_name: string; last_name: string; resume: string }; date_of_application: Date; status: string }[] }>("applicants.applicant", "first_name last_name resume")
      .lean();
    if (!jobs) return res.status(200).json([]);

    const allApplicantIds = jobs.flatMap(job => job.applicants.map(app => app.applicant?._id));
    const allJobIds = jobs.map(job => job._id);

    const testSubmissions = await TestSubmission.find({
      job: { $in: allJobIds },
      applicant: { $in: allApplicantIds },
    }).lean();

    const submissionMap = new Map();
    testSubmissions.forEach(sub => submissionMap.set(`${sub.job}-${sub.applicant}`, sub));

    const formattedResponse = jobs.flatMap(job =>
      job.applicants.map(app => {
        const testSubmission = submissionMap.get(`${job._id}-${app.applicant._id}`);

        return {
          candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
          date_of_application: app.date_of_application,
          job_title: job.job_title,
          resume: app.applicant.resume,
          application_test_cv_sorting_status: testSubmission?.status,
          application_test_score: testSubmission?.score,
          application_status: app.status,
        };
      })
    );

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const GetAllJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId }).select("job_title createdAt job_type employment_type country applicants is_live").lean();
    if (!jobs) return res.status(200).json([]);

    const formattedResponse = jobs.map(job => ({
      job_title: job.job_title,
      date_created: (job as any).createdAt,
      job_type: job.job_type,
      employment_type: job.employment_type,
      country: job.country,
      no_of_applicants: job.applicants.length,
      is_active: job.is_live,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const GetAllJobsWithCandidatesHires = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId, "applicants.status": "hired" })
      .select("job_title employment_type country state city salary currency_type payment_frequency applicants")
      .populate<{ applicants: { applicant: { _id: string; first_name: string; last_name: string; resume: string }; date_of_application: string; status: string }[] }>("applicants.applicant", "first_name last_name resume")
      .lean();

    if (!jobs) return res.status(200).json([]);

    const formattedResponse = jobs
      .map(job => {
        const hiredApplicants = job.applicants.filter(app => app.status === "hired");

        return hiredApplicants.map(app => ({
          candidate_id: app.applicant._id,
          candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
          resume: app.applicant.resume,
          job_id: job._id,
          job_title: job.job_title,
          employment_type: job.employment_type,
          location: `${job.city}, ${job.state}, ${job.country}`,
          salary: job.salary,
          currency: job.currency_type,
          payment_frequency: job.payment_frequency,
          date_of_application: app.date_of_application,
        }));
      })
      .flat();

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const GetActiveJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId, is_live: true }).select("job_title createdAt job_type employment_type country applicants").lean();
    if (!jobs) return res.status(200).json([]);

    const formattedResponse = jobs.map(job => ({
      job_title: job.job_title,
      date_created: (job as any).createdAt,
      job_type: job.job_type,
      employment_type: job.employment_type,
      country: job.country,
      no_of_applicants: job.applicants.length,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { TotalApplicantsTable, GetAllJobs, GetActiveJobs, GetAllJobsWithCandidatesHires };
