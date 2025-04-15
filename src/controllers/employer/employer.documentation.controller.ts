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
      .select("job candidates")
      .populate<{
        job: { applicants: { _id: string; applicant: Types.ObjectId; date_of_application: Date }[]; job_title: string };

        candidates: { _id: string; first_name: string; last_name: string; resume: string }[];
      }>([
        { path: "job", select: "job_title applicants" },
        { path: "candidates", select: "first_name last_name resume" },
      ])
      .lean();

    if (!interview) return res.status(404).json({ message: "No interview found for this job" });

    const { job, candidates } = interview;

    const qualifiedCandidates = candidates.map(candidate => {
      const application = job.applicants.find(app => app.applicant.toString() === candidate._id.toString());

      return {
        full_name: `${candidate.first_name} ${candidate.last_name}`,
        date_of_application: application?.date_of_application,
        role_applied_for: job.job_title,
        resume: candidate.resume,
        // hired: application ? application.hired : false,
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
    const documentFiles = req.file;

    if (!invitation_letter || Object.keys(documents).length === 0) return res.status(400).json({ message: "Invitation Letter and Document Specifications are required" });

    if (!Array.isArray(candidate_ids)) return res.status(400).json({ message: "Candidate IDs must be an array of valid user IDs" });

    if (!documentFiles) return res.status(404).json({ message: "No File Uploaded!" });

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job not found!" });

    // Construct full file path
    const filePath = path.join(__dirname, "../../uploads", documentFiles.filename);

    // Ensure file exists
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({ error: "File not found after upload" });
    }

    const response = await cloudinary.uploader.upload(filePath, {
      folder: `jobs/${job_id}/contracts`,
      resource_type: "auto",
    });

    // ✅ Delete local file after successful upload
    fs.unlink(filePath, err => {
      if (err) console.error("Error deleting file:", err);
      else console.log("File deleted successfully:", filePath);
    });

    await Documentation.create({
      job: job_id,
      invitation_letter,
      contract_agreement_file: response.secure_url,
      documents,
    });

    //* send candidate email and notification
    await Promise.all(
      candidate_ids.map(async id => {
        const existingUser = await User.findById(id);
        if (!existingUser) return;

        //* notification
        const title = "You're Hired! Next Steps for Your New Role";
        const subject = `Congratulations! You have been selected for the role associated with ${job.job_title}. An official invitation letter has been sent, and you are required to upload the specified documents to complete the hiring process. Please check your dashboard for further instructions.`;
        const io = getSocketIO();

        io.to(existingUser._id.toString()).emit("application_status", {
          type: "status",
          title,
          message: subject,
        });

        await Notification.create({
          recipient: existingUser._id,
          sender: userId,
          type: NotificationType.APPLICATION_STATUS,
          title: subject,
          message: subject,
          status: NotificationStatus.UNREAD,
        });

        //* update applicant status
        await Job.updateOne({ _id: job_id, "applicants.applicant": existingUser._id }, { $set: { "applicants.$.status": "offer_sent" } });
      })
    );

    res.status(200).json({ message: "Invite Sent Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsForDocumentation, getQualifiedCandidates, hireCandidate };
