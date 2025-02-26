import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../utils/handleErrors";
import { cutOffSchema, EmployerInterviewManagementSchema, JobPostCreationSchema, testSchema } from "../../utils/types/employerJobsValidatorSchema";
import Job from "../../models/jobs/jobs.model";
import Test from "../../models/jobs/test.model";
import JobTest from "../../models/assessment/jobtest.model";
import Calendar from "../../models/assessment/calendar.model";
import { Types } from "mongoose";
import InterviewMgmt from "../../models/interview/interview.model";
import crypto from "crypto";
import { hashPassword } from "../../utils/hashPassword";
import User from "../../models/users.model";

//* get specified company jobs with applicants
const getJobsWithApplicants = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId, applicants: { $gt: 0 } }).lean();
    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* job post creation
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

const applicationTest = async function (req: IUserRequest, res: Response) {
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

const applicationTestCutoff = async function (req: IUserRequest, res: Response) {
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

//* job test management
const jobTest = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id, instruction, questions } = testSchema.parse(req.body);

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job with the specified ID not found" });

    let test;

    if (jobTest.job_test) {
      test = await Test.findByIdAndUpdate(jobTest.job_test, { instruction, questions }, { new: true, runValidators: true });
    } else {
      test = await Test.create({
        job: jobTest.job,
        employer: jobTest.employer,
        instruction,
        questions,
      });

      // Update the job document to reference the new test
      jobTest.job_test = test._id;
      jobTest.stage = "set_test";
      await jobTest.save();
    }
    return res.status(200).json({ message: "Application test updated successfully", test });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const jobTestCutoff = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const { cut_off_points, test_id } = cutOffSchema.parse(req.body);
    const { suitable, probable, not_suitable } = cut_off_points;

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job with the specified ID not found" });

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

    jobTest.cut_off_points = cut_off_points;
    return res.status(200).json({ message: "Job Test Cutoff Updated Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const jobTestInviteMsg = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const { invitation_letter, test_id } = req.body;

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job with the specified ID not found" });

    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    if (!invitation_letter) return res.status(400).json({ message: "Invitation Letter is required!" });

    test.invitation_letter = invitation_letter;
    await test.save();

    return res.status(200).json({ message: "Job test invite created successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const jobTestApplicantsInvite = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const { applicant_ids, test_id } = req.body;

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job with the specified ID not found" });

    const test = await Test.findById(test_id);
    if (!test) return res.status(404).json({ message: "Test not found" });

    //* invite candidates and send them invite to the test, also sending them emails to the provided test

    // Fetch existing invites to avoid duplicates
    const existingInvites = await Calendar.find({
      candidate: { $in: applicant_ids },
      job: job_id,
      job_test: test_id,
    }).distinct("candidate");

    // Filter out candidates who already have an invite
    const newInvites = applicant_ids
      .filter((id: Types.ObjectId) => !existingInvites.includes(id))
      .map((id: Types.ObjectId) => ({
        candidate: id,
        job: job_id,
        employer: userId,
        type: "test",
        job_test: test_id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      }));

    if (newInvites.length > 0) {
      await Calendar.insertMany(newInvites);
    }

    return res.status(200).json({ message: "Applicants invited successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* interview management
const handleSetInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { jobId } = req.query;
    const data = EmployerInterviewManagementSchema.parse(req.body);

    const existingJob = await Job.findById(jobId);
    if (!existingJob) return res.status(404).json({ message: "Job not found!" });

    const newInterview = await InterviewMgmt.create({
      job: jobId,
      employer: userId,
      rating_scale: data.rating_scale,
      interview_time_slot: data.interview_time_slot,
      available_date_time: {},
      invitation_letter: data.invitation_letter,
    });

    return res.status(200).json({ message: "Interview records added", id: newInterview._id });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleSetInterviewInvitePanelists = async function (req: IUserRequest, res: Response) {
  try {
    const { jobId, interview_id } = req.query;
    const { panelists } = req.body;

    const existingJob = await Job.findById(jobId);
    if (!existingJob) return res.status(400).json({ message: "Job not found" });

    const interview = await InterviewMgmt.findById(interview_id);
    if (!interview) return res.status(400).json({ message: "Interview not found!" });

    interview.panelists = panelists;

    const createdPanelists = [];

    if (!panelists || typeof panelists !== "object") return res.status(400).json({ message: "Panelist emails required!" });

    for (const email of panelists) {
      let panelist = await User.findOne({ email });

      if (!panelist) {
        const tempPassword = crypto.randomBytes(8).toString("hex");
        const hashedPassword = await hashPassword(tempPassword);

        panelist = await User.create({
          email,
          password: hashedPassword,
          role: "panelist",
          isTemporary: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        //* send invite email with temporary credentials
      }

      createdPanelists.push(panelist);
    }

    //* save panelists record to Interview documents only when the panelist invites has been succesfully sent out!
    await interview.save();

    return res.status(200).json({ message: "Panelists Invited Successfully", panelists: createdPanelists.map(p => ({ email: p.email, expiresAt: p.expiresAt })) });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsWithApplicants, jobPostCreation, applicationTest, applicationTestCutoff, jobTest, jobTestCutoff, jobTestInviteMsg, jobTestApplicantsInvite, handleSetInterview, handleSetInterviewInvitePanelists };
