import { Response } from "express";
import { handleErrors } from "../../helper/handleErrors";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import TestSubmission from "../../models/jobs/testsubmission.model";
import Test from "../../models/jobs/test.model";
import { Types } from "mongoose";

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

    // Fetch all test submissions
    const testSubmissions = await TestSubmission.find({
      job: { $in: allJobIds },
      applicant: { $in: allApplicantIds },
    }).lean();

    // Get all test IDs from the submissions
    const testIds = testSubmissions.map(sub => sub.test);

    // Fetch all tests with those IDs
    const tests = await Test.find({ _id: { $in: testIds }, type: "application_test" })
      .select("questions type")
      .lean();

    // Create maps for easier lookups
    const submissionMap = new Map<
      string,
      {
        _id: Types.ObjectId;
        test: Types.ObjectId;
        job: Types.ObjectId;
        applicant: Types.ObjectId;
        answers?: { question_id: Types.ObjectId; selected_answer: string }[];
        status: string;
        score?: number;
      }
    >();
    testSubmissions.forEach(sub => submissionMap.set(`${sub.job}-${sub.applicant}`, sub));

    const testMap = new Map<
      string,
      {
        _id: Types.ObjectId;
        type: string;
        questions: {
          _id: string;
          // question: string;
          correct_answer: string;
          options: string[];
          question_type: "text" | "multiple_choice" | "yes/no";
          score: number;
        }[];
      }
    >();
    tests.forEach(test => testMap.set(test._id.toString(), test));

    const formattedResponse = jobs.flatMap(job =>
      job.applicants.map(app => {
        const testSubmission = submissionMap.get(`${job._id}-${app.applicant._id}`);
        let testQuestions: { _id: string; correct_answer: string; options: string[]; selectedAnswer: string | null }[] = [];

        // If there's a test submission, get the test details and questions
        if (testSubmission) {
          const testDetails = testMap.get(testSubmission.test?.toString());

          if (testDetails) {
            // Merge test questions with selected answers
            testQuestions = testDetails.questions.map(q => {
              const selectedAnswer = testSubmission.answers?.find(ans => ans.question_id.toString() === q._id.toString());

              return {
                ...q,
                selectedAnswer: selectedAnswer ? selectedAnswer.selected_answer : null,
              };
            });
          }
        }

        return {
          candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
          date_of_application: app.date_of_application,
          job_title: job.job_title,
          resume: app.applicant.resume,
          application_test_cv_sorting_status: testSubmission?.status,
          application_test_score: testSubmission?.score,
          application_status: app.status,
          test_questions: testQuestions, // Adding the test questions with answers
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
