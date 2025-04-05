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
    const cacheKey = `candidate_job_test_${userId}`;
    const cachedTests = cache.get(cacheKey);
    if (cachedTests) return res.status(200).json(cachedTests);

    const jobTests = await JobTest.find({ candidates_invited: { $in: userId } })
      .populate<{
        job_test: {
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
      }>("job_test")
      .lean();

    const formattedResponse = jobTests.map(test => {
      if (typeof test.job_test === "object") {
        const { _id, instruction, questions, type } = test.job_test;

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

export { getAllJobTests, submitJobTest };
