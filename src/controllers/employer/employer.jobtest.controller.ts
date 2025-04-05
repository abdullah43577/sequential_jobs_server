import { Response } from "express";
import { IUserRequest } from "../../interface";
import { cutOffSchema, testSchema } from "../../utils/types/employerJobsValidatorSchema";
import Job from "../../models/jobs/jobs.model";
import JobTest from "../../models/assessment/jobtest.model";
import Test from "../../models/jobs/test.model";
import { handleErrors } from "../../helper/handleErrors";
import Calendar from "../../models/assessment/calendar.model";
import User from "../../models/users.model";
import { EmailTypes, generateProfessionalEmail } from "../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../utils/nodemailer.ts/transportMail";
import Notification, { NotificationStatus, NotificationType } from "../../models/notifications.model";
import { getSocketIO } from "../../helper/socket";

//* JOB TEST MANAGEMENT
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
    jobTest.stage = "invitation_upload";
    await jobTest.save();

    return res.status(200).json({ message: "Job test invite message created successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

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

    const jobTest = await JobTest.findOne({ job: job_id, employer: userId });
    if (!jobTest) return res.status(404).json({ message: "Job Test not found" });

    const test = await Test.findById(jobTest.job_test)
      .select("_id employer job")
      .populate<{ employer: { first_name: string; last_name: string } | null }>({
        path: "employer",
        select: "first_name last_name",
      })
      .populate<{ job: { job_title: string } | null }>({
        path: "job",
        select: "job_title",
      })
      .lean();
    if (!test) return res.status(404).json({ message: "Test not found" });

    // Filter out candidates who already have an invite
    const uniqueApplicants = applicant_ids.filter(id => !jobTest.candidates_invited.includes(id));

    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days

    const newInvites = uniqueApplicants.map(id => ({
      user: id,
      job: job_id,
      employer: jobTest.employer,
      type: "test",
      job_test: jobTest._id,
      status: "pending",
      expiresAt: expirationDate,
    }));

    if (newInvites.length > 0) {
      await Calendar.insertMany(newInvites);
    }

    // Send invitations
    const emailPromises = newInvites.map(async invite => {
      const user = await User.findById(invite.user);
      if (!user) return null;

      // Generate a unique test link (you might want to generate a more secure token)
      const testLink = `http://localhost:8080/job-test/${test._id}`;

      const emailTemplateData = {
        type: "test" as EmailTypes,
        title: "Job Assessment Invitation",
        recipientName: `${user.first_name} ${user.last_name}`,
        message: `You have been invited to complete a job assessment for the ${test.job?.job_title} position. 
        Please click the button below to start the test. This invitation will expire on ${expirationDate.toLocaleDateString()}. \n\n ${jobTest.invitation_letter}`,
        buttonText: "Start Assessment",
        buttonAction: testLink,
        additionalDetails: {
          date: expirationDate.toLocaleDateString(),
          time: "Open Until " + expirationDate.toLocaleTimeString(),
          organizerName: `${test.employer?.first_name} ${test.employer?.last_name}`,
        },
      };

      // Generate email HTML
      const { html } = generateProfessionalEmail(emailTemplateData);

      const subject = `Job Assessment Invitation - ${(test.job as any).job_title}`;

      // Send email
      await transportMail({
        email: user.email,
        subject,
        message: html,
      });

      const message = `${test.employer?.first_name} ${test.employer?.last_name} as invited you to take a job test.`;

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

      io.to(user._id.toString()).emit("job_test_invite", {
        type: "invite",
        title: subject,
        message,
        jobTitle: (test.job as any).job_title,
        testId: test._id,
        expiresAt: expirationDate,
      });

      jobTest.stage = "candidate_invite";
      jobTest.candidates_invited.push(user._id);
      await jobTest.save();
      return;
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

export { jobTest, jobTestCutoff, jobTestInviteMsg, jobTestApplicantsInvite };
