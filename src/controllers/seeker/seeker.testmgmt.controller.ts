import { Response } from "express";
import { IUserRequest } from "../../interface";
import NodeCache from "node-cache";
import JobTest from "../../models/assessment/jobtest.model";
import { handleErrors } from "../../helper/handleErrors";
import { JobTestSubmissionSchema } from "../../utils/types/seekerValidatorSchema";
import TestSubmission from "../../models/jobs/testsubmission.model";
import Test from "../../models/jobs/test.model";

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

//*  TEST MANAGEMENT
const getAllJobTests = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobTests = await JobTest.find({ candidates_invited: { $in: userId } })
      .select("job employer job_test updatedAt")
      .populate("job", "job_title")
      .populate("employer", "organisation_name")
      .lean<
        {
          _id: string;
          job: { job_title: string };
          employer: { organisation_name: string };
          job_test: string;
          updatedAt: Date; // This shows updatedAt is at the root level
        }[]
      >();

    const formattedResponse = await Promise.all(
      jobTests.map(async test => {
        const hasTakenJobTest = await TestSubmission.findOne({ applicant: userId, test: test.job_test });

        return {
          job_test_id: test.job_test, //* the ref to the actual global Test Schema
          job_title: test.job.job_title,
          organisation_name: test.employer.organisation_name,
          updatedAt: test.updatedAt,
          has_taken_job_test: !!hasTakenJobTest,
        };
      })
    );

    // cache.set(cacheKey, formattedResponse);
    return res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobTestDetails = async function (req: IUserRequest, res: Response) {
  try {
    const { test_id } = req.query;

    const test = await Test.findById(test_id).select("instruction questions type").lean();
    if (!test) return res.status(404).json({ message: "Test with specified ID not found!" });

    res.status(200).json(test);
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

    //* check if submission has occurred before
    const submissions = await TestSubmission.find({ test: job_test_id, applicant: userId });
    if (submissions) return res.status(400).json({ message: "You've already submitted this test" });

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

export { getAllJobTests, getJobTestDetails, submitJobTest };
