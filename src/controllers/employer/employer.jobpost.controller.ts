import { Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { cutOffSchema, JobPostCreationSchema, testSchema } from "../../utils/types/employerJobsValidatorSchema";
import NodeCache from "node-cache";
import Test from "../../models/jobs/test.model";
import { handleErrors } from "../../helper/handleErrors";

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

//* JOB POST CREATION
const jobPostCreation = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const data = JobPostCreationSchema.parse(req.body);

    if (data.job_id) {
      const job = await Job.findByIdAndUpdate(data.job_id, data, { returnDocument: "after", runValidators: true }).lean();

      if (!job) return res.status(404).json({ message: "Job not found" });

      // Invalidate related cache
      cache.del(`applied_jobs_for_${userId}`);

      return res.status(200).json({ message: "Job Updated", job });
    }

    const job = await Job.create({ ...data, employer: userId, stage: "job_post_creation" });

    // Invalidate related cache
    cache.del(`applied_jobs_for_${userId}`);

    return res.status(201).json({ message: "Job Created", job });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const applicationTest = async function (req: IUserRequest, res: Response) {
  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    const { job_id, instruction, questions } = testSchema.parse(req.body);

    const job = await Job.findById(job_id).select("application_test, employer stage");
    if (!job) {
      return res.status(404).json({ message: "Job with the specified ID not found" });
    }

    let test;

    if (job.application_test) {
      test = await Test.findByIdAndUpdate(job.application_test, { instruction, questions }, { returnDocument: "after", runValidators: true });

      // await session.commitTransaction();
      return res.status(200).json({ message: "Application test updated successfully", test });
    }

    test = await Test.create({
      job: job_id,
      employer: job.employer,
      instruction,
      questions,
      type: "application_test",
    });

    // Update the job document to reference the new test
    job.application_test = test._id;
    job.stage = "set_cv_sorting_question";
    await job.save();

    // await session.commitTransaction();
    return res.status(200).json({ message: "Application test created successfully", application_test_id: test._id });
  } catch (error) {
    // await session.abortTransaction();
    handleErrors({ res, error });
  }
};

const applicationTestCutoff = async function (req: IUserRequest, res: Response) {
  try {
    const { cut_off_points, test_id } = cutOffSchema.parse(req.body);
    const { suitable, probable, not_suitable } = cut_off_points;

    const test = await Test.findById(test_id).select("questions cut_off_points");
    if (!test) return res.status(404).json({ message: "Test not found" });

    const total_marks = test.questions.reduce((acc, q) => acc + q.score, 0);
    // console.log(total_marks, "total marks");

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

    //* upgrade properties and mark job as LIVE
    test.cut_off_points = cut_off_points;
    const job = await Job.findById(test.job);
    if (!job) return res.status(400).json({ message: "Job with corresponding test ID not found" });

    job.is_live = true;
    await test.save();
    await job.save();

    return res.status(200).json({ message: "Cut-off points updated successfully", test });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { jobPostCreation, applicationTest, applicationTestCutoff };
