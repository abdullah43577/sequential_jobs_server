import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import Test from "../models/jobs/test.model";
import JobTest from "../models/assessment/jobtest.model";
import TestSubmission from "../models/jobs/testsubmission.model";

//* JOB TESTS JOB TABLE
const handleGetApplicantsForJobTest = async function (job_id: string, req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const job = await Job.findById(job_id).select("_id applicants").lean();
    if (!job) return res.status(404).json({ message: "Job not found!" });

    // Fetch all application test submissions for this job
    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job Test not found" });

    const testSubmissions = await TestSubmission.find({ job: job_id })
      .populate({
        path: "applicant",
        select: "first_name last_name email",
      })
      .lean();

    if (!testSubmissions.length) {
      return res.status(404).json({ message: "No test submissions found for this job." });
    }

    //* get corresponding test IDs
    const testIds = testSubmissions.map(sub => sub.test);

    // get all tests with corresponding ID
    const tests = await Test.find({ _id: { $in: testIds } })
      .select("questions type")
      .lean();

    // Match applicants who have taken the "application_test"
    const applicantsWithTests = job.applicants.map(app => {
      const testResult = testSubmissions.find(submission => {
        //* find those who have submitted application test
        const test = tests.find(t => t._id.toString() === submission.test?.toString());

        return submission.applicant._id.toString() === app.applicant._id.toString() && test?.type === "application_test";
      });

      if (!testResult) return null;

      //* get corresponding test detail
      const testDetails = tests.find(t => t._id.toString() === testResult.test?.toString());

      if (!testDetails) return null;

      // Merge test questions with selected answers
      const formattedQuestions = testDetails.questions.map(q => {
        const selectedAnswer = testResult.answers?.find(ans => ans.question_id.toString() === q._id.toString());

        return {
          ...q,
          selectedAnswer: selectedAnswer ? selectedAnswer.selected_answer : null, // Attach selected answer
        };
      });

      return {
        applicant: testResult.applicant,
        test: {
          ...testDetails,
          questions: formattedQuestions,
        },
        status: testResult.status,
        has_been_invited: jobTest.candidates_invited.includes(app.applicant._id),
      };
    });

    res.status(200).json(applicantsWithTests);
  } catch (error) {
    throw error;
  }
};

//* get specified company jobs with applicants
const getJobsWithApplicants = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { req_type, job_id } = req.query;

    const acceptedReqType = ["job_test", "interview", "documentation", "medical"];

    if (req_type && !acceptedReqType.includes(req_type as string)) {
      return res.status(400).json({ message: "Invalid Query Params" });
    }

    if (req_type === "job_test") return handleGetApplicantsForJobTest(job_id as string, req, res);

    const job = await Job.find({ employer: userId }).select("job_title country state city job_type employment_type salary currency_type years_of_exp payment_frequency").lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    return res.status(200).json(job);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithApplicants };
