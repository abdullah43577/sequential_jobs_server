import { Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { handleErrors } from "../../helper/handleErrors";
import { ApplicationTestSubmissionSchema } from "../../utils/types/seekerValidatorSchema";
import Test from "../../models/jobs/test.model";
import TestSubmission from "../../models/jobs/testsubmission.model";
import { Types } from "mongoose";
import User from "../../models/users.model";
import { sendTestSubmissionNotificationEmail } from "../../utils/services/emails/testSubmissionEmailService";
import { getBaseUrl } from "../../helper/getBaseUrl";

//* JOBS
const getAllJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const currentCountry = req.query.currentCountry as string;
    const skip = (page - 1) * limit;

    console.log(currentCountry, "current country filter");

    // Build query with country filter if provided
    const baseQuery = { is_live: true };
    const query = currentCountry && currentCountry.trim() ? { ...baseQuery, country: new RegExp(`^${currentCountry.trim()}$`, "i") } : baseQuery;

    // const cacheKey = `cached_jobs__${userId}__page_${page}__country_${currentCountry || 'all'}`;

    // const cachedJobs = cache.get(cacheKey);
    // if (cachedJobs) {
    //   return res.status(200).json(cachedJobs);
    // }

    // Get total job count with country filter
    const totalJobs = await Job.countDocuments(query);

    const jobs = await Job.find(query)
      .select("employer job_title state city employment_type salary payment_frequency currency_type technical_skills applicants")
      .populate("employer", "organisation_name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const jobsWithAppliedStatus = await Promise.all(
      jobs.map(async job => {
        const hasApplied = job.applicants?.some(data => data.applicant.toString() === userId);
        return {
          ...job,
          has_applied: hasApplied,
        };
      })
    );

    const responseData = {
      jobs: jobsWithAppliedStatus,
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
    };

    // cache.set(cacheKey, responseData);

    return res.status(200).json(responseData);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobDetails = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.params;

    // const cacheKey = `single_job_cache__${job_id}`;
    // const cachedJob = cache.get(cacheKey);
    // if (cachedJob) return res.status(200).json(cachedJob);

    const job = await Job.findById(job_id)
      .select("employer job_title country state city job_type salary currency_type years_of_exp description application_test applicants createdAt")
      .populate({ path: "application_test", select: "instruction questions type" })
      .populate({ path: "employer", select: "organisation_name" })
      .lean();
    if (!job) return res.status(404).json({ message: "Job with specified ID, not found!" });

    // Check if the current user has applied for this job
    const hasApplied = job.applicants?.some(data => data.applicant.toString() === userId);

    // Add has_applied property to the job object
    (job as any).has_applied = hasApplied || false;

    //* check if user has taken application test
    const testSubmission = await TestSubmission.findOne({ job: job_id, applicant: userId })
      .populate({
        path: "test",
        select: "type",
        match: { type: "application_test" },
      })
      .lean();

    (job as any).has_taken_application_test = !!testSubmission;

    // cache.set(cacheKey, jobObject);

    res.status(200).json(job);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const applyForJob = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.body;

    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job with specified ID, not found!" });

    //* check if user has a resume
    const user = await User.findById(userId).select("resume");
    if (!user?.resume) return res.status(400).json({ message: "You need to upload a resume before applying for a job" });

    //* check if user has applied already
    const userExistInApplicantsPool = job.applicants.find(id => id.toString() === userId?.toString());

    if (userExistInApplicantsPool) return res.status(400).json({ message: "You already applied for this job" });

    job.applicants.push({
      applicant: userId as unknown as Types.ObjectId,
      status: "applied",
    });
    await job.save();

    res.status(200).json({ message: "Application Created" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getApplicationTest = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;

    // const cacheKey = `job_application_test__${job_id}`;

    // const cachedTest = cache.get(cacheKey);
    // if (cachedTest) return res.status(200).json({ application_test: cachedTest });

    const job = await Job.findById(job_id)
      .populate<{
        application_test: {
          _id: string;
          instruction: string;
          questions: {
            _id: string;
            question_type: "multiple_choice" | "yes/no" | "text";
            options: string[];
            score: number;
            correct_answer: string;
          }[];
          type: "application_test" | "job_test";
        };
      }>("application_test")
      .lean();
    if (!job) return res.status(404).json({ message: "Job with specified ID not found!" });

    if (typeof job.application_test === "object") {
      const { _id, instruction, questions, type } = job.application_test;

      const filteredQuestions = questions.map(({ correct_answer, score, ...rest }) => rest);

      const responseObject = {
        application_test_id: _id,
        instruction,
        questions: filteredQuestions,
        type,
      };

      // cache.set(cacheKey, responseObject);

      res.status(200).json(responseObject);
    }
  } catch (error) {
    handleErrors({ res, error });
  }
};

const submitApplicationTest = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const { application_test_id, job_id, answers } = ApplicationTestSubmissionSchema.parse(req.body);

    const test = await Test.findById(application_test_id)
      .populate<{ job: { _id: string; job_title: string } }>({ path: "job", select: "job_title" })
      .populate<{ employer: { _id: string; first_name: string; last_name: string; email: string } }>({ path: "employer", select: "first_name last_name email" });
    if (!test) return res.status(404).json({ message: "Test not found!" });

    let totalScore = 0;
    const gradedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q._id.toString() === answer.question_id);

      const isCorrect = question?.correct_answer === answer.selected_answer;
      if (isCorrect) totalScore += question?.score || 0;

      return { ...answer, is_correct: isCorrect };
    });

    const submission = await TestSubmission.create({
      test: application_test_id,
      job: job_id,
      applicant: userId,
      employer: test.employer,
      answers: gradedAnswers,
      score: totalScore,
    });

    const candidateStatus = submission.status === "suitable" ? "shortlisted" : "applied";

    //* update candidate status
    await Job.findOneAndUpdate(
      { _id: job_id, "applicants.applicant": userId },
      {
        $set: {
          "applicants.$.status": candidateStatus,
        },
      }
    );

    const candidate = await User.findById(userId).select("first_name last_name");
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // Send email to employer
    await sendTestSubmissionNotificationEmail({
      employer: {
        email: test.employer.email,
        firstName: test.employer.first_name,
        lastName: test.employer.last_name,
      },
      candidate: {
        firstName: candidate.first_name,
        lastName: candidate.last_name,
      },
      job: {
        title: test.job.job_title,
      },
      test: {
        title: "Assessment Test",
        type: "application_test",
      },
      submission: {
        id: submission._id.toString(),
        score: totalScore,
        totalQuestions: test.questions.length,
      },
      baseUrl: getBaseUrl(req),
    });

    res.status(201).json({ message: "Test submitted successfully", submission });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getAllJobs, getJobDetails, applyForJob, getApplicationTest, submitApplicationTest };
