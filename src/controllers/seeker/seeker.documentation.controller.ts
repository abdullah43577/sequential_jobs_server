import { Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { handleErrors } from "../../helper/handleErrors";
import Documentation from "../../models/documentation.model";
import fs from "fs";
import path from "path";
import cloudinary from "../../utils/cloudinaryConfig";

//* DOCUMENTATION MANAGEMENT
const getJobsFormatForDocumentation = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ "applicants.applicant": userId }).select("employer job_title applicants").populate<{ employer: { organisation_name: string } }>("employer");
    if (!jobs) return res.status(404).json({ message: "No Job Applications found" });

    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateApplicantStatus = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { applicant_status, job_id } = req.body;
    if (!applicant_status) return res.status(404).json({ message: "Applicant status is required" });

    const job = await Job.findOneAndUpdate({ _id: job_id, "applicants.applicant": userId }, { $set: { "applicants.$.status": applicant_status } }, { returnDocument: "after" });

    if (!job) return res.status(404).json({ message: "Job not found!" });

    const documentation = await Documentation.findOne({ job: job_id }).select("documents").lean();
    if (!documentation) return res.status(404).json({ message: "Documents Record not found!" });

    res.status(200).json({ job, documentation });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const submitDocuments = async function (req: IUserRequest, res: Response) {
  try {
    const documents = req.files as Express.Multer.File[];
    const { job_id } = req.body;

    if (!documents || documents.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    if (!job_id) return res.status(404).json({ message: "Job ID is required" });

    const documentation = await Documentation.findOne({ job: job_id });
    if (!documentation) return res.status(404).json({ message: "Documentation with specified ID not found" });

    const uploadedFiles: Map<string, string> = new Map();

    // Upload files to Cloudinary and store URLs
    for (const file of documents) {
      const filePath = path.join(__dirname, "../../uploads", file.filename);

      if (!fs.existsSync(filePath)) {
        return res.status(500).json({ error: `File not found: ${file.filename}` });
      }

      const response = await cloudinary.uploader.upload(filePath, {
        folder: `documents/${documentation._id}`,
        resource_type: "auto",
      });

      uploadedFiles.set(file.originalname, response.secure_url);

      // ✅ Delete local file after successful upload
      fs.unlink(filePath, err => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    // Save file URLs in the `documents` field
    // documentation.documents = uploadedFiles;
    // await documentation.save();

    res.status(200).json({ message: "Documents Submitted Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsFormatForDocumentation, updateApplicantStatus, submitDocuments };
