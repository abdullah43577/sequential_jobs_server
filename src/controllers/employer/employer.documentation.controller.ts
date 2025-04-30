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
import { getBaseUrl } from "../../helper/getBaseUrl";

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
        decision: application?.status === "has_offer" ? "Offer Sent" : "Send Offer",
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
    // const { invitation_letter, documents, candidate_ids } = req.body;
    const invitation_letter = req.body.invitation_letter;
    const documents = JSON.parse(req.body.documents || "{}");
    const candidate_ids = JSON.parse(req.body.candidate_ids || "[]");
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

        await Job.updateOne({ _id: job_id, "applicants.applicant": user._id }, { $set: { "applicants.$.status": "has_offer" } });
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
      .filter(app => app.status === "has_offer")
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

    const formattedResponse = await Promise.all(
      job.applicants
        .filter(app => app.status === "hired")
        .map(async app => {
          const candidate = interview?.candidates.find(cd => cd.candidate.toString() === app.applicant.toString());

          const documentation = await Documentation.findOne({ job: job._id });

          const candidateDocEntry = documentation?.candidates.find(cd => cd.candidate.toString() === app.applicant._id.toString());

          return {
            candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
            resume: app.applicant.resume,
            documents: candidateDocEntry?.documents,
            date_of_application: app.date_of_application,
            role_applied_for: job.job_title,
            interview_result: candidate?.interview_score ? `${candidate?.interview_score} / ${totalObtainableGrade}` : "Not Graded",
          };
        })
    );

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const requestReUploadDocuments = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { candidate_id, job_id, documents, message } = req.body;

    if (!candidate_id || typeof candidate_id !== "string") return res.status(400).json({ message: "Candidate ID is required and must be a string" });

    if (!job_id || typeof job_id !== "string") return res.status(400).json({ message: "Job ID is required and must be a string" });

    if (!documents || !Array.isArray(documents) || documents.length === 0) return res.status(400).json({ message: "At least one document must be specified for re-upload" });

    // Find the job to get details and ensure employer owns this job
    const job = await Job.findOne({ _id: job_id, employer: userId }).select("job_title");

    if (!job) return res.status(404).json({ message: "Job not found or you don't have permission to manage this job" });

    // Find the candidate to get their details
    const candidate = await User.findById(candidate_id).select("first_name last_name email");

    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // Update the documentation record to mark documents as requiring re-upload
    const documentationRecord = await Documentation.findOneAndUpdate(
      {
        job: job_id,
        "candidates.candidate": candidate_id,
      },
      {
        $set: {
          "candidates.$.documents_requiring_reupload": documents,
        },
      },
      { returnDocument: "after" }
    );

    if (!documentationRecord) return res.status(404).json({ message: "Documentation record not found" });

    // Update job status to indicate document re-upload requested
    await Job.findOneAndUpdate(
      { _id: job_id, "applicants.applicant": candidate_id },
      {
        $set: {
          "applicants.$.status": "documents_reupload_requested",
        },
      }
    );

    // Find employer details
    const employer = await User.findById(userId).select("first_name last_name email organisation_name");

    if (!employer) return res.status(404).json({ message: "Employer profile not found" });

    // Format document list for email
    const documentsList = documents.map(doc => `- ${doc}`).join("\n");

    // Prepare email data
    const emailSubject = `Action Required: Re-upload Documents for ${job.job_title} Position`;

    const candidateEmailData = {
      type: "document_reupload" as EmailTypes,
      title: "Documents Re-upload Request",
      recipientName: `${candidate.first_name} ${candidate.last_name}`,
      message: `${employer.organisation_name} has requested that you re-upload the following documents for your application to the ${job.job_title} position:`,
      buttonText: "Upload Documents",
      buttonAction: `${getBaseUrl(req)}/extension/jobs/${job_id}/documentation`,
      additionalDetails: {
        // company: employer.organisation_name,
        // position: job.job_title,
        // documents: documentsList,
        // employerMessage: message || "Please re-upload the following documents.",
        // deadline: "As soon as possible to avoid delays in your application process.",
      },
    };

    const { html: candidateHtml } = generateProfessionalEmail(candidateEmailData);

    // Send email to candidate
    await transportMail({
      email: candidate.email,
      subject: emailSubject,
      message: candidateHtml,
    });

    // Create notification for candidate
    const candidateNotification = await Notification.create({
      recipient: candidate_id,
      sender: userId,
      type: NotificationType.DOCUMENT_REQUEST,
      title: emailSubject,
      message: `${employer.organisation_name} has requested that you re-upload documents for your application to the ${job.job_title} position.`,
      status: NotificationStatus.UNREAD,
    });

    // Send socket notification to candidate
    const io = getSocketIO();
    io.to(candidate_id).emit("notification", {
      id: candidateNotification._id,
      title: emailSubject,
      message: `${employer.organisation_name} has requested that you re-upload documents for your application to the ${job.job_title} position.`,
      status: NotificationStatus.UNREAD,
      type: NotificationType.DOCUMENT_REQUEST,
      createdAt: candidateNotification.createdAt,
    });

    // Return success response
    res.status(200).json({
      message: "Document re-upload request sent successfully",
      documents_requested: documents,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsForDocumentation, getQualifiedCandidates, hireCandidate, getCandidatesWithOffers, getCandidatesWithAcceptedOffer, requestReUploadDocuments };
