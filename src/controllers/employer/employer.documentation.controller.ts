import { Response } from "express";
import { IUserRequest } from "../../interface";
import InterviewMgmt from "../../models/interview/interview.model";
import { handleErrors } from "../../helper/handleErrors";
import cloudinary from "../../utils/cloudinaryConfig";
import Documentation from "../../models/documentation.model";
import { getSocketIO } from "../../helper/socket";
import Notification, { NotificationStatus, NotificationType } from "../../models/notifications.model";
import Job from "../../models/jobs/jobs.model";
import fs from "fs";
import path from "path";
import User from "../../models/users.model";
import TestSubmission from "../../models/jobs/testsubmission.model";
import { Types } from "mongoose";
import { Readable } from "stream";
import { transportMail } from "../../utils/nodemailer.ts/transportMail";
import { EmailTypes, generateProfessionalEmail } from "../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";

//* DOCUMENTATION MANAGEMENT
const getJobsForDocumentation = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const interviewJobs = await InterviewMgmt.find({ employer: userId, "candidates.0": { $exists: true } })
      .select("job")
      .populate<{ job: { _id: string; job_title: string; createdAt: Date; applicants: { applicant: Types.ObjectId; date_of_application: Date; status: string }[]; job_type: string; employment_type: string } }>(
        "job",
        "job_title createdAt applicants job_type employment_type"
      )
      .lean();

    if (!interviewJobs) return res.status(200).json([]);

    const formattedResponse = interviewJobs.map(data => {
      return {
        job_id: data.job._id,
        job_title: data.job.job_title,
        date_created: (data.job as any).createdAt,
        no_of_applicants: data.job.applicants.length,
        job_type: data.job.job_type,
        employment_type: data.job.employment_type,
        action: "",
      };
    });

    return res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getQualifiedCandidates = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;

    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const interview = await InterviewMgmt.findOne({ job: job_id })
      .select("job rating_scale candidates")
      .populate<{ job: { job_title: string; applicants: { _id: string; applicant: { _id: string }; date_of_application: Date; status: string }[] } }>({
        path: "job",
        select: "job_title applicants",
        populate: {
          path: "applicants.applicant",
          select: "_id",
        },
      })
      .populate<{ candidates: { candidate: { _id: string; first_name: string; last_name: string; resume: string }; scheduled_date_time: Record<string, any>; interview_score: number; status: string }[] }>(
        "candidates.candidate",
        "first_name last_name resume"
      )
      .lean();

    if (!interview) return res.status(404).json({ message: "No interview found for this job" });

    const { job, rating_scale, candidates } = interview;

    const totalObtainableGrade = Object.values(rating_scale).reduce((acc, cur) => +acc + +cur, 0);

    const qualifiedCandidates = candidates.map(candidate => {
      const application = job.applicants.find(app => app.applicant._id.toString() === candidate.candidate._id.toString());

      return {
        candidate_id: candidate.candidate._id,
        full_name: `${candidate.candidate.first_name} ${candidate.candidate.last_name}`,
        date_of_application: application?.date_of_application,
        role_applied_for: job.job_title,
        resume: candidate.candidate.resume,
        hired: application?.status === "hired",
        interview_result: candidate.interview_score ? `${candidate.interview_score} / ${totalObtainableGrade}` : "Not Graded",
        decision: application?.status === "offer_sent" ? "Offer Sent" : "Send Offer",
      };
    });

    res.status(200).json(qualifiedCandidates);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const hireCandidate = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.params;
    const { invitation_letter, documents, candidate_ids } = req.body;
    const documentFile = req.file;

    if (!invitation_letter || Object.keys(documents).length === 0) return res.status(400).json({ message: "Invitation Letter and Document Specifications are required" });

    if (!Array.isArray(candidate_ids)) return res.status(400).json({ message: "Candidate IDs must be an array of valid user IDs" });

    if (!documentFile) return res.status(404).json({ message: "No File Uploaded!" });

    const job = await Job.findById(job_id).populate<{ employer: { organisation_name: string } }>("employer", "organisation_name").lean();
    if (!job) return res.status(404).json({ message: "Job not found!" });

    // ✅ Upload file buffer directly to Cloudinary
    const streamUpload = () =>
      new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `jobs/${job_id}/contracts`,
            resource_type: "auto",
          },
          (error, result) => {
            if (error || !result) return reject("Cloudinary upload failed");
            resolve(result as { secure_url: string });
          }
        );

        const bufferStream = new Readable();
        bufferStream.push(documentFile.buffer);
        bufferStream.push(null);
        bufferStream.pipe(stream);
      });

    const response = await streamUpload();

    const candidates: { candidate: string; invitation_letter: string; contract_agreement_file: string; documents: Map<string, string>; status?: string }[] = [];
    candidate_ids.map(id => candidates.push({ candidate: id, invitation_letter, contract_agreement_file: response.secure_url, documents }));

    await Documentation.create({
      job: job_id,
      candidates,
    });

    //* send candidate email and notification
    const io = getSocketIO();

    await Promise.all(
      candidate_ids.map(async id => {
        const user = await User.findById(id);
        if (!user) return;

        const subject = `You're Hired! - ${job.job_title}`;
        const title = "You're Hired! Next Steps for Your New Role";
        const message = `Congratulations! You have been selected for the ${job.job_title} position at ${job.employer.organisation_name}. An official invitation letter has been issued, and you are required to upload the specified documents to complete your onboarding.`;

        // Email content
        const emailTemplateData = {
          type: "hire" as EmailTypes,
          title: "You're Hired!",
          recipientName: `${user.first_name} ${user.last_name}`,
          message: `${message}\n\n${invitation_letter}`,
          buttonText: "View Offer Details",
          buttonAction: "http://localhost:8080/user/dashboard",
          additionalDetails: {
            organizerName: job.employer.organisation_name,
          },
        };

        const { html } = generateProfessionalEmail(emailTemplateData);

        // Send Email
        await transportMail({
          email: user.email,
          subject,
          message: html,
        });

        // Send Notification
        const notification = await Notification.create({
          recipient: user._id,
          sender: userId,
          type: NotificationType.APPLICATION_STATUS,
          title: subject,
          message,
          status: NotificationStatus.UNREAD,
        });

        // Emit socket notification
        io.to(user._id.toString()).emit("notification", {
          id: notification._id,
          title,
          message,
          status: NotificationStatus.UNREAD,
          type: NotificationType.IMPORTANT,
          createdAt: notification.createdAt,
        });

        await Job.updateOne({ _id: job_id, "applicants.applicant": user._id }, { $set: { "applicants.$.status": "offer_sent" } });
      })
    );

    res.status(200).json({ message: "Invite Sent Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getCandidatesWithOffers = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;

    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    const job = await Job.findById(job_id)
      .select("employer job_title applicants")
      .populate<{ applicants: { applicant: { _id: string; first_name: string; last_name: string; resume: string }; date_of_application: Date; status: string }[] }>("applicants.applicant", "first_name last_name resume");

    if (!job) return res.status(200).json([]);

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("rating_scale candidates").lean();

    if (!interview) return res.status(404).json({ message: "Interview record not found!" });

    const totalObtainableGrade = Object.values(interview?.rating_scale).reduce((acc, cur) => +acc + +cur, 0);

    const formattedResponse = job.applicants
      .filter(app => app.status === "offer_sent")
      .map(app => {
        const candidate = interview?.candidates.find(cd => cd.candidate.toString() === app.applicant.toString());

        return {
          candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
          resume: app.applicant.resume,
          date_of_application: app.date_of_application,
          role_applied_for: job.job_title,
          interview_result: candidate?.interview_score ? `${candidate?.interview_score} / ${totalObtainableGrade}` : "Not Graded",
        };
      });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getCandidatesWithAcceptedOffer = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;

    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    const job = await Job.findById(job_id)
      .select("employer job_title applicants")
      .populate<{ applicants: { applicant: { _id: string; first_name: string; last_name: string; resume: string }; date_of_application: Date; status: string }[] }>("applicants.applicant", "first_name last_name resume");

    if (!job) return res.status(200).json([]);

    const interview = await InterviewMgmt.findOne({ job: job_id });

    if (!interview) return res.status(404).json({ message: "Interview record not found!" });

    const totalObtainableGrade = Object.values(interview?.rating_scale).reduce((acc, cur) => +acc + +cur, 0);

    const formattedResponse = job.applicants
      .filter(app => app.status === "hired")
      .map(app => {
        const candidate = interview?.candidates.find(cd => cd.candidate.toString() === app.applicant.toString());

        return {
          candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
          resume: app.applicant.resume,
          date_of_application: app.date_of_application,
          role_applied_for: job.job_title,
          interview_result: candidate?.interview_score ? `${candidate?.interview_score} / ${totalObtainableGrade}` : "Not Graded",
        };
      });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsForDocumentation, getQualifiedCandidates, hireCandidate, getCandidatesWithOffers, getCandidatesWithAcceptedOffer };
