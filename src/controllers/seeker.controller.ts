import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import { Types } from "mongoose";
import cloudinary from "../utils/cloudinaryConfig";
import Test from "../models/jobs/test.model";
import TestSubmission from "../models/jobs/testsubmission.model";
import { ApplicationTestSubmissionSchema, JobTestSubmissionSchema } from "../utils/types/seekerValidatorSchema";
import NodeCache from "node-cache";
import { IApplicationTest } from "../utils/types/controllerInterfaces";
import fs from "fs";
import path from "path";
import User from "../models/users.model";
import JobTest from "../models/assessment/jobtest.model";

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

//* JOBS
const getAllJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `cached_jobs__${userId}__page_${page}`;

    const cachedJobs = cache.get(cacheKey);
    if (cachedJobs) {
      return res.status(200).json(cachedJobs);
    }

    // Get total job count
    const totalJobs = await Job.countDocuments({ is_live: true });

    const jobs = await Job.find({ is_live: true }).select("employer job_title state city employment_type salary payment_frequency technical_skills").populate("employer", "organisation_name").skip(skip).limit(limit).lean();

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

    cache.set(cacheKey, responseData);

    return res.status(200).json(responseData);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobDetails = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;

    const cacheKey = `single_job_cache__${job_id}`;
    const cachedJob = cache.get(cacheKey);
    if (cachedJob) return res.status(200).json(cachedJob);

    const job = await Job.findById(job_id).populate("application_test");
    if (!job) return res.status(404).json({ message: "Job with specified ID, not found!" });

    cache.set(cacheKey, job);

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

    //* check if user has applied already
    const userExistInApplicantsPool = job.applicants.find(id => id.toString() === userId?.toString());

    if (userExistInApplicantsPool) return res.status(400).json({ message: "You already applied for this job" });

    job.applicants.push({
      applicant: userId as unknown as Types.ObjectId,
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

    const cacheKey = `job_application_test__${job_id}`;

    const cachedTest = cache.get(cacheKey);
    if (cachedTest) return res.status(200).json({ application_test: cachedTest });

    const job = await Job.findById(job_id).populate("application_test").lean();
    if (!job) return res.status(404).json({ message: "Job with specified ID not found!" });

    if (typeof job.application_test === "object") {
      const { _id, instruction, questions, type } = job.application_test as unknown as IApplicationTest;

      const filteredQuestions = questions.map(({ correct_answer, score, ...rest }) => rest);

      const responseObject = {
        application_test_id: _id,
        instruction,
        questions: filteredQuestions,
        type,
      };

      cache.set(cacheKey, responseObject);

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

    const test = await Test.findById(application_test_id);
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

    res.status(201).json({ message: "Test submitted successfully", submission });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* RESUME MANAGEMENT
const uploadResume = async function (req: IUserRequest, res: Response) {
  try {
    const { userId, role } = req;
    const resume = req.file;
    if (!resume) return res.status(404).json({ message: "No File Uploaded" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Construct full file path
    const filePath = path.join(__dirname, "../../uploads", resume.filename);

    // Ensure file exists
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: "File not found after upload" });
    }

    const response = await cloudinary.uploader.upload(filePath, {
      folder: `users/${role}/${userId}/resume`,
      resource_type: "auto",
    });

    user.resume = response.secure_url;
    await user.save();

    // ✅ Delete local file after successful upload
    fs.unlink(filePath, err => {
      if (err) console.error("Error deleting file:", err);
      else console.log("File deleted successfully:", filePath);
    });

    res.status(200).json({ message: "Resume Upload Success", url: response.secure_url });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//*  TEST MANAGEMENT
const getAllJobTests = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const cacheKey = `candidate_job_test_${userId}`;
    const cachedTests = cache.get(cacheKey);
    if (cachedTests) return res.status(200).json(cachedTests);

    const jobTests = await JobTest.find({ candidates_invited: { $in: userId } })
      .populate("job_test")
      .lean();

    const formattedResponse = jobTests.map(test => {
      if (typeof test.job_test === "object") {
        const { _id, instruction, questions, type } = test.job_test as unknown as IApplicationTest;

        const filteredQuestions = questions.map(({ correct_answer, score, ...rest }) => rest);

        return {
          job_test_id: _id,
          instruction,
          questions: filteredQuestions,
          type,
        };
      }
    });

    cache.set(cacheKey, formattedResponse);
    return res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const submitJobTest = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_test_id, answers } = JobTestSubmissionSchema.parse(req.body);

    const test = await Test.findById(job_test_id);
    if (!test) return res.status(404).json({ message: "Test not found!" });

    let totalScore = 0;
    const gradedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q._id.toString() === answer.question_id);

      const isCorrect = question?.correct_answer === answer.selected_answer;
      if (isCorrect) totalScore += question?.score || 0;

      return { ...answer, is_correct: isCorrect };
    });

    const submission = await TestSubmission.create({
      test: job_test_id,
      job: test.job,
      applicant: userId,
      employer: test.employer,
      answers: gradedAnswers,
      score: totalScore,
    });

    return res.status(200).json({ message: "Test submitted successfully", submission });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* INTERVIEW MANAGEMENT
const getJobsWithoutScheduledInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getAllJobs, getJobDetails, applyForJob, getApplicationTest, submitApplicationTest, uploadResume, getAllJobTests, submitJobTest };
