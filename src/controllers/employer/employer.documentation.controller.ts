import { Response } from "express";
import { IUserRequest } from "../../interface";
import InterviewMgmt from "../../models/interview/interview.model";
import { handleErrors } from "../../helper/handleErrors";
import cloudinary from "../../utils/cloudinaryConfig";
import Documentation from "../../models/documentation.model";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";
import Job from "../../models/jobs/jobs.model";
import { Types } from "mongoose";
import { Readable } from "stream";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { sendHireCandidateEmail } from "../../utils/services/emails/hireCandidateEmailService";
import User from "../../models/users.model";
import { sendReuploadDocumentEmail } from "../../utils/services/emails/reuploadDocumentEmailService";

const { CLIENT_URL } = process.env;

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

    const formattedResponse = interviewJobs
      .filter(data => data.job)
      .map(data => {
        return {
          job_id: data.job?._id,
          job_title: data.job?.job_title,
          date_created: (data.job as any).createdAt,
          no_of_applicants: data.job?.applicants.length,
          job_type: data.job?.job_type,
          employment_type: data.job?.employment_type,
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

const sendCandidateOffer = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.params;
    const { invitation_letter, documents, candidate_id } = req.body;

    const parsedDocuments = JSON.parse(documents) || "{}";

    const documentFile = req.file;

    if (!invitation_letter || Object.keys(parsedDocuments).length === 0 || !candidate_id) return res.status(400).json({ message: "Invitation Letter, Document and Candidate ID Specifications are required" });

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

    const candidate = { candidate: candidate_id, invitation_letter, contract_agreement_file: response.secure_url, documents: parsedDocuments };

    const user = await User.findById(candidate_id);
    if (!user) return res.status(404).json({ message: "User not found!" });

    //* find corresponding documentation if it exists
    const documentation = await Documentation.findOne({ job: job_id });

    if (documentation) {
      const userHasBeenInvitedBefore = documentation.candidates.some(cd => cd.candidate.toString() === candidate_id);

      if (!userHasBeenInvitedBefore) {
        documentation.candidates.push(candidate);
        await documentation.save();
      }
    } else {
      await Documentation.create({
        job: job_id,
        candidates: [candidate],
      });

      const subject = `You're Hired! - ${job.job_title}`;
      const message = `Congratulations! You have been selected for the ${job.job_title} position at ${job.employer.organisation_name}. An official invitation letter has been issued, and you are required to upload the specified documents to complete your onboarding.`;

      // Send Email
      await sendHireCandidateEmail({
        email: user.email,
        recipientName: `${user.first_name} ${user.last_name}`,
        jobTitle: job.job_title,
        companyName: job.employer.organisation_name,
        invitationLetter: invitation_letter,
        dashboardUrl: `${CLIENT_URL}/dashboard/job-seeker/documentation-management`,
      });

      // Send Notification
      await createAndSendNotification({
        recipient: user._id,
        sender: userId as string,
        type: NotificationType.APPLICATION_STATUS,
        title: subject,
        message,
        status: NotificationStatus.UNREAD,
      });

      await Job.updateOne({ _id: job_id, "applicants.applicant": user._id }, { $set: { "applicants.$.status": "has_offer" } });
    }

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
        const candidate = interview?.candidates.find(cd => cd.candidate.toString() === app.applicant._id.toString());

        console.log(candidate, "candidate info");

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

    const interview = await InterviewMgmt.findOne({ job: job_id }).lean();

    if (!interview) return res.status(404).json({ message: "Interview record not found!" });

    const totalObtainableGrade = Object.values(interview?.rating_scale).reduce((acc, cur) => +acc + +cur, 0);

    const formattedResponse = await Promise.all(
      job.applicants
        .filter(app => app.status === "hired")
        .map(async app => {
          const candidate = interview?.candidates.find(cd => cd.candidate.toString() === app.applicant._id.toString());

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

    const btnUrl = `${CLIENT_URL}/extension/jobs/${job_id}/documentation`;

    //* send mail
    await sendReuploadDocumentEmail({ email: candidate.email, first_name: candidate.first_name, last_name: candidate.last_name, job_title: job.job_title, organisation_name: employer.organisation_name, btnUrl });

    // Create notification for candidate
    await createAndSendNotification({
      recipient: candidate_id as any,
      sender: userId as string,
      type: NotificationType.DOCUMENT_REQUEST,
      title: emailSubject,
      message: `${employer.organisation_name} has requested that you re-upload documents for your application to the ${job.job_title} position.`,
      status: NotificationStatus.UNREAD,
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

export { getJobsForDocumentation, getQualifiedCandidates, sendCandidateOffer, getCandidatesWithOffers, getCandidatesWithAcceptedOffer, requestReUploadDocuments };
