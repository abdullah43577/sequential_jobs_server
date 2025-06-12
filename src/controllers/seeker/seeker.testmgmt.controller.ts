import { Response } from "express";
import { IUserRequest } from "../../interface";
import JobTest from "../../models/assessment/jobtest.model";
import { handleErrors } from "../../helper/handleErrors";
import { JobTestSubmissionSchema } from "../../utils/types/seekerValidatorSchema";
import TestSubmission from "../../models/jobs/testsubmission.model";
import Test from "../../models/jobs/test.model";
import { getBaseUrl } from "../../helper/getBaseUrl";
import { sendTestSubmissionNotificationEmail } from "../../utils/services/emails/testSubmissionEmailService";
import User from "../../models/users.model";

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

    const test = await Test.findById(job_test_id)
      .populate<{ job: { _id: string; job_title: string } }>({
        path: "job",
        select: "job_title",
      })
      .populate<{ employer: { _id: string; first_name: string; last_name: string; email: string } }>({
        path: "employer",
        select: "first_name last_name email",
      });

    if (!test) return res.status(404).json({ message: "Test not found!" });

    // Get candidate information
    const candidate = await User.findById(userId).select("first_name last_name");
    if (!candidate) return res.status(404).json({ message: "Candidate not found!" });

    let totalScore = 0;
    const gradedAnswers = answers.map(answer => {
      const question = test.questions.find(q => q._id.toString() === answer.question_id);

      const isCorrect = question?.correct_answer === answer.selected_answer;
      if (isCorrect) totalScore += question?.score || 0;

      return { ...answer, is_correct: isCorrect };
    });

    // Check if submission has occurred before
    const submissions = await TestSubmission.findOne({ test: job_test_id, applicant: userId });
    if (submissions) return res.status(400).json({ message: "You've already submitted this test" });

    const submission = await TestSubmission.create({
      test: job_test_id,
      job: test.job,
      applicant: userId,
      employer: test.employer,
      answers: gradedAnswers,
      score: totalScore,
    });

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
        type: "job_test",
      },
      submission: {
        id: submission._id.toString(),
        score: totalScore,
        totalQuestions: test.questions.length,
      },
      baseUrl: getBaseUrl(req),
    });

    return res.status(200).json({ message: "Test submitted successfully", submission });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getAllJobTests, getJobTestDetails, submitJobTest };
