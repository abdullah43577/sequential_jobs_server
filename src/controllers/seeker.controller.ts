import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import { Types } from "mongoose";
import cloudinary from "../utils/cloudinaryConfig";
import Test from "../models/jobs/test.model";
import TestSubmission from "../models/jobs/testsubmission.model";
import { ApplicationTestSubmissionSchema } from "../utils/types/seekerValidatorSchema";

//* jobs screen
const getAllJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ is_live: true }).lean();

    const jobsWithAppliedStatus = jobs.map(job => {
      const hasApplied = job.applicants.some(applicant => applicant.user.toString() === userId);
      return { ...job, has_applied: hasApplied };
    });

    return res.status(200).json(jobsWithAppliedStatus);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobDetails = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    const job = await Job.findById(job_id).populate("application_test");
    if (!job) return res.status(404).json({ message: "Job with specified ID, not found!" });

    res.status(200).json(job);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const applyForJob = async function (req: IUserRequest, res: Response) {
  try {
    const { userId, role } = req;
    const { job_id } = req.params;
    const { cv } = req.body;
    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job with specified ID, not found!" });

    const data = await cloudinary.uploader.upload(cv, {
      folder: `users/${role}/${userId}/cv`,
    });

    job.applicants.push({
      user: userId as unknown as Types.ObjectId,
      cv: data.secure_url,
      applied_at: new Date(),
    });
    await job.save();

    res.status(200).json({ message: "Application Created" });
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
      status: "suitable",
    });

    res.status(201).json({ message: "Test submitted successfully", submission });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getAllJobs, getJobDetails, applyForJob, submitApplicationTest };
