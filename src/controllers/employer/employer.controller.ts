import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../utils/handleErrors";
import { cutOffSchema, JobPostCreationSchema, testSchema } from "../../utils/types/employerJobsValidatorSchema";
import Job from "../../models/jobs/jobs.model";
import Test from "../../models/jobs/test.model";

const jobPostCreation = async function (req: IUserRequest, res: Response) {
  try {
    const { userId, role } = req;
    if (role !== "company") return res.status(401).json({ message: "Unauthorized" });
    const data = JobPostCreationSchema.parse(req.body);

    if (data.job_id) {
      const job = await Job.findOneAndUpdate({ _id: data.job_id, employer: userId }, data, { new: true, runValidators: true });

      if (!job) return res.status(404).json({ message: "Job not found" });

      return res.status(200).json({ message: "Job Updated", job });
    }

    const job = new Job({ ...data, employer: userId });
    await job.save();
    return res.status(201).json({ message: "Job Created", job });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const cvSortingQuestions = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id, instruction, questions } = testSchema.parse(req.body);

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job with the specified ID not found" });

    let test;

    if (job.application_test) {
      test = await Test.findByIdAndUpdate(job.application_test, { instruction, questions }, { new: true, runValidators: true });
    } else {
      test = await Test.create({
        job: job._id,
        employer: job.employer,
        instruction,
        questions,
      });

      // Update the job document to reference the new test
      job.application_test = test._id;
      job.stage = "set_cut_off_points";
      await job.save();
    }
    return res.status(200).json({ message: "Application test updated successfully", test });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const setApplicationTestCutOff = async function (req: IUserRequest, res: Response) {
  try {
    const { cut_off_points, test_id } = cutOffSchema.parse(req.body);
    const { suitable, probable, not_suitable } = cut_off_points;

    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    const total_marks = test.questions.reduce((acc, q) => acc + q.score, 0);

    if (not_suitable.min !== 0) {
      return res.status(400).json({ message: "The minimum score for 'not_suitable' must be 0." });
    }

    if (not_suitable.max + 1 !== probable.min) {
      return res.status(400).json({ message: "'probable.min' must be exactly 1 greater than 'not_suitable.max'." });
    }

    if (probable.max + 1 !== suitable.min) {
      return res.status(400).json({ message: "'suitable.min' must be exactly 1 greater than 'probable.max'." });
    }

    if (suitable.max !== total_marks) {
      return res.status(400).json({ message: "'suitable.max' must be equal to the total obtainable marks." });
    }

    test.cut_off_points = cut_off_points;
    await test.save();

    return res.status(200).json({ message: "Cut-off points updated successfully", test });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { jobPostCreation, cvSortingQuestions, setApplicationTestCutOff };
