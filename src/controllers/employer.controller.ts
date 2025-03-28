import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import { cutOffSchema, EmployerInterviewManagementSchema, JobPostCreationSchema, testSchema } from "../utils/types/employerJobsValidatorSchema";
import Job from "../models/jobs/jobs.model";
import Test from "../models/jobs/test.model";
import JobTest from "../models/assessment/jobtest.model";
import Calendar from "../models/assessment/calendar.model";
import { Types } from "mongoose";
import InterviewMgmt from "../models/interview/interview.model";
import crypto from "crypto";
import { hashPassword } from "../helper/hashPassword";
import User from "../models/users.model";

import NodeCache from "node-cache";
import TestSubmission from "../models/jobs/testsubmission.model";
import { transportMail } from "../utils/nodemailer.ts/transportMail";
import { EmailTypes, generateProfessionalEmail } from "../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { getSocketIO } from "../helper/socket";
import Notification, { NotificationStatus, NotificationType } from "../models/notifications.model";
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

//* extension
const handleGetApplicantsForJobTest = async function (job_id: string, req: IUserRequest, res: Response) {
  try {
    const job = await Job.findById(job_id).select("_id applicants").lean();
    if (!job) return res.status(404).json({ message: "Job not found!" });

    // Fetch all test submissions for this job
    const testSubmissions = await TestSubmission.find({ job: job_id })
      .populate({
        path: "applicant",
        select: "first_name last_name email",
      })
      .lean();

    if (!testSubmissions.length) {
      return res.status(404).json({ message: "No test submissions found for this job." });
    }

    //* get corresponding test IDs
    const testIds = testSubmissions.map(sub => sub.test);

    // get all tests with corresponding ID
    const tests = await Test.find({ _id: { $in: testIds } })
      .select("questions type")
      .lean();

    // Match applicants who have taken the "application_test"
    const applicantsWithTests = job.applicants.map(app => {
      const testResult = testSubmissions.find(submission => {
        //* find those who have submitted application test
        const test = tests.find(t => t._id.toString() === submission.test?.toString());

        return submission.applicant._id.toString() === app.applicant._id.toString() && test?.type === "application_test";
      });

      if (!testResult) return null;

      //* get corresponding test detail
      const testDetails = tests.find(t => t._id.toString() === testResult.test?.toString());

      if (!testDetails) return null;

      // Merge test questions with selected answers
      const formattedQuestions = testDetails.questions.map(q => {
        const selectedAnswer = testResult.answers?.find(ans => ans.question_id.toString() === q._id.toString());

        return {
          ...q,
          selectedAnswer: selectedAnswer ? selectedAnswer.selected_answer : null, // Attach selected answer
        };
      });

      return {
        applicant: testResult.applicant,
        test: {
          ...testDetails,
          questions: formattedQuestions,
        },
        status: testResult.status,
      };
    });

    res.status(200).json(applicantsWithTests);
  } catch (error) {
    throw error;
  }
};

//* get specified company jobs with applicants
const getJobsWithApplicants = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { req_type, job_id } = req.query;

    const acceptedReqType = ["job_test", "interview", "documentation", "medical"];

    if (req_type && !acceptedReqType.includes(req_type as string)) {
      return res.status(400).json({ message: "Invalid Query Params" });
    }

    if (req_type === "job_test") return handleGetApplicantsForJobTest(job_id as string, req, res);

    const job = await Job.find({ employer: userId }).select("job_title country state city job_type employment_type salary currency_type years_of_exp payment_frequency").lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    return res.status(200).json(job);
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* job post creation
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

//* job test management
const jobTest = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id, instruction, questions } = testSchema.parse(req.body);

    //* check for existence of job
    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json({ message: "Job with the specified ID not found" });
    }

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });

    let test;

    if (jobTest?.job_test) {
      test = await Test.findByIdAndUpdate(jobTest.job_test, { instruction, questions }, { returnDocument: "after", runValidators: true });
    } else {
      test = await Test.create({
        job: job_id,
        employer: userId,
        instruction,
        questions,
        type: "job_test",
      });

      await JobTest.create({
        job: job_id,
        employer: userId,
        job_test: test._id,
        stage: "set_test",
      });
    }

    return res.status(200).json({ message: "Job test updated successfully", test });
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

    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json({ message: "Job with the specified ID not found" });
    }

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

    test.cut_off_points = cut_off_points;
    jobTest.stage = "set_cutoff";
    await test.save();
    await jobTest.save();

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

    if (!job_id) return res.status(400).json({ message: "Job ID is required" });
    if (!invitation_letter || !test_id) return res.status(400).json({ message: "Invitation Letter and Test ID is required" });

    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json({ message: "Job with the specified ID not found" });
    }

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job Test with the specified credentials not found" });

    jobTest.invitation_letter = invitation_letter;
    await jobTest.save();

    return res.status(200).json({ message: "Job test invite created successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* TO BE CONTINUED FROM HERE....

const jobTestApplicantsInvite = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const { applicant_ids } = req.body;

    if (!applicant_ids || !Array.isArray(applicant_ids)) {
      return res.status(400).json({
        message: "Applicant ID field is required and must be an array",
      });
    }

    const test = await Test.findOne({ job: job_id, type: "job_test" })
      .select("_id employer job")
      .populate({
        path: "employer",
        select: "first_name last_name",
      })
      .populate({
        path: "job",
        select: "job_title",
      })
      .lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    // Fetch existing invites to avoid duplicates
    const existingInvites = await Calendar.find({
      candidate: { $in: applicant_ids },
      job: job_id,
      job_test: test._id,
    }).distinct("candidate");

    // Filter out candidates who already have an invite
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newInvites = applicant_ids
      .filter((id: Types.ObjectId) => !existingInvites.includes(id))
      .map((id: Types.ObjectId) => ({
        candidate: id,
        job: job_id,
        employer: userId,
        type: "test",
        job_test: test._id,
        expiresAt: expirationDate, // Expires in 7 days
      }));

    if (newInvites.length > 0) {
      await Calendar.insertMany(newInvites);
    }

    // Send invitations
    const emailPromises = newInvites.map(async invite => {
      const user = await User.findById(invite.candidate);
      if (!user) return null;

      // Generate a unique test link (you might want to generate a more secure token)
      const testLink = `http://localhost:8080/job-test/${test._id}`;

      const emailTemplateData = {
        type: "test" as EmailTypes,
        title: "Job Assessment Invitation",
        recipientName: `${user.first_name} ${user.last_name}`,
        message: `You have been invited to complete a job assessment for the ${(test.job as any).job_title} position. 
        Please click the button below to start the test. This invitation will expire on ${expirationDate.toLocaleDateString()}.`,
        buttonText: "Start Assessment",
        buttonAction: testLink,
        additionalDetails: {
          date: expirationDate.toLocaleDateString(),
          time: "Open Until " + expirationDate.toLocaleTimeString(),
          organizerName: `${(test.employer as any).first_name} ${(test.employer as any).last_name}`,
        },
      };

      // Generate email HTML
      const { html } = generateProfessionalEmail(emailTemplateData);

      const subject = `Job Assessment Invitation - ${(test.job as any).job_title}`;

      // Send email
      transportMail({
        email: user.email,
        subject,
        message: html,
      });

      const message = `${(test.employer as any).first_name} ${(test.employer as any).last_name} as invited you to take a job test.`;

      //* notification
      await Notification.create({
        recipient: user._id,
        sender: userId,
        type: NotificationType.MESSAGE,
        title: subject,
        message,
        status: NotificationStatus.UNREAD,
      });

      //* socket instance
      const io = getSocketIO();

      return io.to(`${user._id.toString()}`).emit("job_test_invite", {
        type: "invite",
        title: subject,
        message,
        jobTitle: (test.job as any).job_title,
        testId: test._id,
        expiresAt: expirationDate,
      });
    });

    // Wait for all emails to be sent
    await Promise.allSettled(emailPromises);

    return res.status(200).json({
      message: "Applicants invited successfully!",
      invitedCount: newInvites.length,
    });
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
