//* applied_jobs, interviews_attended, job_tests_taken, job_offers, job_tests_scheduled

import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import Job from "../../models/jobs/jobs.model";
import InterviewMgmt from "../../models/interview/interview.model";
import JobTest from "../../models/assessment/jobtest.model";
import TestSubmission from "../../models/jobs/testsubmission.model";
import Documentation from "../../models/documentation.model";

const getAppliedJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ "applicants.applicant": userId }).select("employer job_title applicants").populate<{ employer: { _id: string; organisation_name: string } }>("employer", "organisation_name").lean();

    if (!jobs) return res.status(200).json([]);

    const formattedResponse = jobs.map(job => {
      const dataEntry = job.applicants.find(app => app.applicant.toString() === userId);

      return {
        job_title: job.job_title,
        org_name: job.employer.organisation_name,
        date_of_application: dataEntry?.date_of_application,
        has_offer_letter: dataEntry?.status === "has_offer",
        application_status: dataEntry?.status,
      };
    });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getInterviewsAttended = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const interviews = await InterviewMgmt.find({ "candidates.candidate": userId })
      .select("job employer candidates")
      .populate<{ job: { _id: string; job_title: string } }>("job", "job_title")
      .populate<{ employer: { _id: string; organisation_name: string } }>("employer", "organisation_name")
      .lean();

    if (!interviews) return res.status(200).json([]);

    const formattedResponse = interviews.map(interview => {
      const dataEntry = interview.candidates.find(cd => cd.candidate._id.toString() === userId);

      return {
        job_title: interview.job.job_title,
        company_name: interview.employer.organisation_name,
        interview_attended: dataEntry?.status === "completed",
        interview_score: dataEntry?.interview_score || "Not Graded",
      };
    });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobTestsData = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobTests = await JobTest.find({ candidates_invited: { $in: [userId] } })
      .select("job job_test employer invitation_letter")
      .populate<{ job: { _id: string; job_title: string; applicants: { _id: string; applicant: string; date_of_application: string; status: string }[] } }>("job", "job_title applicants")
      .populate<{ employer: { _id: string; organisation_name: string } }>("employer", "organisation_name")
      .lean();

    if (!jobTests) return res.status(200).json([]);

    const formattedResponse = await Promise.all(
      jobTests.map(async jobTest => {
        const testSubmission = await TestSubmission.findOne({ test: jobTest.job_test, applicant: userId });

        const jobEntry = jobTest.job.applicants.find(app => app.applicant.toString() === userId);

        return {
          job_title: jobTest.job.job_title,
          org_name: jobTest.employer.organisation_name,
          job_test_score: testSubmission?.score ?? null,
          invitation_letter: jobTest.invitation_letter,
          application_status: jobEntry?.status,
        };
      })
    );

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobOffers = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ "applicants.applicant": userId, "applicants.status": "has_offer" }).select("job_title job_type employment_type country state city currency_type applicants").lean();

    if (!jobs) return res.status(200).json([]);

    const formattedResponse = await Promise.all(
      jobs.map(async job => {
        const documentation = await Documentation.findOne({ job: job._id });

        const documentationEntry = documentation?.candidates.find(cd => cd.candidate.toString() === userId);

        const applicantEntry = job.applicants.find(app => app.applicant.toString() === userId);

        return {
          job_title: job.job_title,
          application_status: applicantEntry?.status,
          invitation_letter: documentationEntry?.invitation_letter ?? null,
          contract_agreement_file: documentationEntry?.contract_agreement_file ?? null,
          documents_to_be_uploaded: documentationEntry?.documents ?? null,
          job_type: job.job_type,
          employment_type: job.employment_type,
        };
      })
    );

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getAppliedJobs, getInterviewsAttended, getJobTestsData, getJobOffers };
