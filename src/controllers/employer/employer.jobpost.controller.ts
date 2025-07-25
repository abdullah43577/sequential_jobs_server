import { Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { cutOffSchema, JobPostCreationSchema, testSchema } from "../../utils/types/employerJobsValidatorSchema";
import Test from "../../models/jobs/test.model";
import { handleErrors } from "../../helper/handleErrors";
import xlsx from "xlsx";
import { JobData, processUploadData, TestCutoffData, TestQuestionData } from "../../utils/validateAndFormatJobs";
import InterviewMgmt from "../../models/interview/interview.model";
import JobTest from "../../models/assessment/jobtest.model";
import User from "../../models/users.model";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";
import { sendMatchingJobEmail } from "../../utils/services/emails/matchingJobEmailService";
import MedicalMgmt from "../../models/medicals/medical.model";

//* BULK UPLOAD
const handleBulkUpload = async function (req: IUserRequest, res: Response) {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const { userId } = req;

  try {
    // Read the Excel file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });

    // Parse each sheet
    const jobsSheet = workbook.Sheets["Jobs"];
    const testQuestionsSheet = workbook.Sheets["TestQuestions"];
    const testCutoffsSheet = workbook.Sheets["TestCutoffs"];

    if (!jobsSheet) {
      return res.status(400).json({ message: "Jobs sheet is missing in the uploaded file" });
    }

    // Convert sheets to JSON
    const jobsData = xlsx.utils.sheet_to_json<JobData>(jobsSheet);
    const testQuestionsData = testQuestionsSheet ? xlsx.utils.sheet_to_json<TestQuestionData>(testQuestionsSheet) : [];
    const testCutoffsData = testCutoffsSheet ? xlsx.utils.sheet_to_json<TestCutoffData>(testCutoffsSheet) : [];

    // Validate and process data
    const result = await processUploadData(jobsData, testQuestionsData, testCutoffsData, userId as string);

    return res.status(201).json({
      message: "Upload successful",
      jobsCreated: result.jobsCreated,
      testsCreated: result.testsCreated,
      errors: result.errors,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* JOB POST CREATION
const getJobs = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const jobs = await Job.find({ employer: userId }).select("job_title createdAt country job_type employment_type salary currency_type payment_frequency application_test stage is_live").lean();

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const deleteJob = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(404).json({ message: "Job ID is required!" });

    await Job.findByIdAndDelete(job_id);
    await Test.deleteMany({ job: job_id });
    await InterviewMgmt.deleteMany({ job: job_id });
    await JobTest.deleteMany({ job: job_id });
    await Test.deleteMany({ job: job_id });
    await MedicalMgmt.deleteMany({ job: job_id });
    res.status(200).json({ message: "Job Deleted Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const toggleJobState = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    const { status } = req.body;

    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    if (status !== false && status !== true) return res.status(400).json({ message: "Status is required" });

    // Find the job and populate the application_test
    const job = await Job.findById(job_id).populate<{ application_test: { _id: string; cut_off_points: { suitable: { min: number; max: number }; probable: { min: number; max: number }; not_suitable: { min: number; max: number } } } }>(
      "application_test"
    );

    if (!job) return res.status(404).json({ message: "Job not found!" });

    // Only validate if trying to set status to true (make job live)
    if (status === true) {
      // Step 1: Validate required job fields
      const requiredJobFields = ["job_title", "country", "state", "city", "job_type", "employment_type", "salary", "currency_type", "required_experience_level", "payment_frequency", "description"];

      const missingFields = requiredJobFields.filter(field => !(job as any)[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Please complete job creation. Missing fields: ${missingFields.join(", ")}`,
        });
      }

      // Check if skills arrays have content
      if (!job.generic_skills || job.generic_skills.length === 0) {
        return res.status(400).json({
          message: "Please add generic skills to complete job creation",
        });
      }

      if (!job.technical_skills || job.technical_skills.length === 0) {
        return res.status(400).json({
          message: "Please add technical skills to complete job creation",
        });
      }

      // Step 2: Validate application test exists
      if (!job.application_test) {
        return res.status(400).json({
          message: "Please create application test questions before making job live",
        });
      }

      // Step 3: Validate cut-off points are set
      const test = job.application_test;

      if (!test.cut_off_points) {
        return res.status(400).json({
          message: "Please set cut-off points to complete job creation",
        });
      }

      const { suitable, probable, not_suitable } = test.cut_off_points;

      // Check if all cut-off categories have both min and max values
      const isSuitableValid = suitable && suitable.min !== null && suitable.max !== null;
      const isProbableValid = probable && probable.min !== null && probable.max !== null;
      const isNotSuitableValid = not_suitable && not_suitable.min !== null && not_suitable.max !== null;

      if (!isSuitableValid || !isProbableValid || !isNotSuitableValid) {
        return res.status(400).json({
          message: "Please complete setting cut-off points for all categories (suitable, probable, not_suitable) before making job live",
        });
      }
    }

    // Update the job status
    const updatedJob = await Job.findByIdAndUpdate(job_id, { is_live: status }, { new: true });

    const statusMessage = status ? "Job is now live!" : "Job has been taken offline";

    res.status(200).json({
      message: statusMessage,
      job: updatedJob,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const jobPostCreation = async function (req: IUserRequest, res: Response) {
  try {
    const { userId: current_user_id } = req;

    const data = JobPostCreationSchema.parse(req.body);

    //* if user_id is passed in the body use that instead of the user id in the request object as it's used for admins functionality
    const userId = data.user_id?.length ? data.user_id : current_user_id;

    if (data.job_id) {
      const job = await Job.findByIdAndUpdate(data.job_id, data, { returnDocument: "after", runValidators: true }).lean();

      if (!job) return res.status(404).json({ message: "Job not found" });

      return res.status(200).json({ message: "Job Updated", job });
    }

    const job = await Job.create({ ...data, employer: userId, stage: "job_post_creation" });

    return res.status(201).json({ message: "Job Created", job });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getJobDraft = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const job = await Job.findById(job_id).select("job_title country state city job_type employment_type salary currency_type payment_frequency generic_skills technical_skills description job_category required_experience_level").lean();

    res.status(200).json({ success: !!job, job });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const applicationTest = async function (req: IUserRequest, res: Response) {
  // const session = await mongoose.startSession();
  // session.startTransaction();

  try {
    const { job_id, instruction, questions } = testSchema.parse(req.body);

    const job = await Job.findById(job_id).select("application_test employer stage");
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
    if (job.is_live) job.is_live = false;
    await job.save();

    return res.status(200).json({ message: "Application test created successfully", application_test_id: test._id });
  } catch (error) {
    // await session.abortTransaction();
    handleErrors({ res, error });
  }
};

const getApplicationTestDraft = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const application_test = await Test.findOne({ job: job_id }).select("instruction questions type").lean();

    res.status(200).json({
      success: !!application_test,
      application_test,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const applicationTestCutoff = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const { cut_off_points } = cutOffSchema.parse(req.body);
    const { suitable, probable, not_suitable } = cut_off_points;

    const test = await Test.findOne({ job: job_id, type: "application_test" }).select("job questions cut_off_points");
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
    const job = await Job.findById(job_id);

    if (!job) return res.status(400).json({ message: "Job with corresponding test ID not found" });

    job.is_live = true;
    job.stage = "set_cut_off_points";
    await test.save();
    await job.save();

    //* NOTIFY RELEVANT CANDIDATES

    //* find relevant candidates
    const candidates = await User.find({ role: "job-seeker", "job_preferences.categories": { $in: [job.job_category] } });

    const employer = await User.findById(userId).select<{ _id: string; organisation_name: string }>("organisation_name");

    //* send email to relevant candidates
    await Promise.all(
      candidates.map(async cd => {
        await sendMatchingJobEmail({ email: cd.email, first_name: cd.first_name, last_name: cd.last_name, job_title: job.job_title, organisation_name: employer?.organisation_name as string, btnUrl: "" });
      })
    );

    //* send notification to relevant candidates
    await Promise.all(
      candidates.map(async cd => {
        await createAndSendNotification({
          recipient: cd._id,
          sender: userId as string,
          type: NotificationType.INFO,
          title: "🎯 Job Opportunity Just for You!",
          message: `We found a job that aligns with your preferences! ${employer?.organisation_name} is hiring for the ${job.job_title} role.`,
          status: NotificationStatus.UNREAD,
        });
      })
    );

    return res.status(200).json({ message: "Cut-off points updated successfully", test });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getApplicationTestCutoffDraft = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const cut_off_points = await Test.findOne({ job: job_id }).select("cut_off_points").lean();

    res.status(200).json({ success: !!cut_off_points, cut_off_points });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { handleBulkUpload, getJobs, deleteJob, toggleJobState, jobPostCreation, getJobDraft, applicationTest, getApplicationTestDraft, applicationTestCutoff, getApplicationTestCutoffDraft };
