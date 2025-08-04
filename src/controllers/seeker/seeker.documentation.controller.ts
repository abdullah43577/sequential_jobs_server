import { Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { handleErrors } from "../../helper/handleErrors";
import Documentation from "../../models/documentation.model";
import cloudinary from "../../utils/cloudinaryConfig";
import { Readable } from "stream";

//* DOCUMENTATION MANAGEMENT
const getJobsFormatForDocumentation = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const statusArray = ["has_offer", "hired", "rejected"];

    const jobs = await Job.find({ "applicants.applicant": userId, "applicants.status": { $in: statusArray } })
      .select("job_type employment_type employer job_title applicants")
      .populate<{ employer: { organisation_name: string } }>("employer")
      .lean();

    if (!jobs) return res.status(404).json({ message: "No Job Applications found" });

    const formattedResponse = (
      await Promise.all(
        jobs.map(async job => {
          const dataEntry = job.applicants.find(j => j.applicant.toString() === userId);

          const documentation = await Documentation.findOne({ job: job._id }).lean();

          const docEntry = documentation?.candidates.find(cd => cd.candidate.toString() === userId);

          if (!docEntry) return null;

          const has_submitted_documents = Object.values(docEntry.documents).some(val => val?.trim());

          return {
            job_id: job._id,
            job_title: job.job_title,
            company: job.employer.organisation_name,
            date_of_application: dataEntry?.date_of_application,
            job_type: job.job_type,
            employment_type: job.employment_type,
            status: dataEntry?.status,
            offer_letter: docEntry?.invitation_letter,
            contract_agreement_file: docEntry?.contract_agreement_file,
            docs_to_be_uploaded: docEntry?.documents,
            has_submitted_documents,
          };
        })
      )
    ).filter(Boolean);

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateApplicantStatus = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { applicant_status, job_id } = req.body;

    if (!applicant_status) return res.status(404).json({ message: "Applicant status is required" });

    if (applicant_status !== "hired" && applicant_status !== "rejected") return res.status(400).json({ message: "Applicant Status can either be hired or rejected" });

    const job = await Job.findOneAndUpdate({ _id: job_id, "applicants.applicant": userId }, { $set: { "applicants.$.status": applicant_status } }, { returnDocument: "after" });

    if (!job) return res.status(404).json({ message: "Job not found!" });

    res.status(200).json({ message: "Applicant Status Updated" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const submitDocuments = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const documents = req.files as Express.Multer.File[];
    const { job_id, fieldKeys } = req.body;

    if (!documents || documents.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    if (!job_id || !fieldKeys) {
      return res.status(400).json({ message: "Job ID, Candidate ID, and Field Keys are required" });
    }

    const documentation = await Documentation.findOne({ job: job_id });
    if (!documentation) return res.status(404).json({ message: "Documentation not found" });

    const fieldKeyList: string[] = JSON.parse(fieldKeys);

    const uploadedDocs: Map<string, string> = new Map();

    for (let i = 0; i < documents.length; i++) {
      const file = documents[i];
      const key = fieldKeyList[i];

      await new Promise<void>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `documents/${job_id}/${userId}`,
            resource_type: "auto",
          },
          async (error, result) => {
            if (error || !result?.secure_url) return reject(error || new Error("Upload failed"));
            uploadedDocs.set(key, result.secure_url);
            resolve();
          }
        );

        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
      });
    }

    // Find candidate entry and update
    const candidateEntry = documentation.candidates.find(c => c.candidate.toString() === userId);
    if (!candidateEntry) return res.status(404).json({ message: "Candidate not found in documentation" });

    uploadedDocs.forEach((url, key) => {
      candidateEntry.documents.set(key, url);
    });

    await documentation.save();

    res.status(200).json({ message: "Documents Submitted Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsFormatForDocumentation, updateApplicantStatus, submitDocuments };
