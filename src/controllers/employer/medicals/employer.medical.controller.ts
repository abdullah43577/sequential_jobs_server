import { Response } from "express";
import { IUserRequest } from "../../../interface";
import { handleErrors } from "../../../helper/handleErrors";
import Job from "../../../models/jobs/jobs.model";
import { EmployerMedicalsManagementSchema } from "../../../utils/types/employerJobsValidatorSchema";
import MedicalMgmt from "../../../models/medicals/medical.model";
import { generateAvailableSlots } from "../../../utils/generateAvailableSlots";
import User from "../../../models/users.model";
import { batchInviteMedicalists } from "./inviteMedicalists";
import { batchInviteCandidates } from "./sendCandidateMedicalInvite";
import { Types } from "mongoose";
import cloudinary from "../../../utils/cloudinaryConfig";
import { Readable } from "stream";

const getJobsForMedical = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId, is_live: true }).select("job_title applicants salary job_type createdAt").lean();

    //* extract job ids
    const jobIds = jobs.map(job => job._id);

    const medicals = await MedicalMgmt.find({ job: { $in: jobIds } });

    const formattedResponse = jobs.map(job => {
      const medicalData = medicals.find(medical => medical.job.toString() === job._id.toString());

      return {
        ...job,
        has_set_availability_schedule: !!medicalData,
      };
    });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getCandidatesInvitedForMedicals = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ message: "JOb ID is required" });

    const medicals = await MedicalMgmt.findOne({ job: job_id }).select("candidates").populate<{
      candidates: { candidate: { first_name: string; last_name: string; phone_no: string; resume: string; profile_pic: string; email: string } }[];
    }>("candidates.candidate", "first_name last_name phone_no resume profile_pic email");

    if (!medicals) return res.status(404).json({ message: "Medical Record not found!" });

    const formattedResponse = medicals?.candidates.map(cd => ({
      name: `${cd.candidate.first_name} ${cd.candidate.last_name}`,
      phone_no: cd.candidate.phone_no,
      resume: cd.candidate.resume,
      profile_pic: cd.candidate.profile_pic,
      email: cd.candidate.email,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const setMedicalAvailability = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const data = EmployerMedicalsManagementSchema.parse(req.body);

    if (!job_id) return res.status(200).json({ message: "Job ID is required" });

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job not found!" });

    // Get employer info for notifications
    const employer = await User.findById(userId).select("organisation_name").lean();
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    const existingMedicals = await MedicalMgmt.findOne({ job: job_id }).lean();
    if (existingMedicals) return res.status(200).json({ message: "A Medical record for the specified job already exists." });

    const processedTimeSlots = data.medical_time_slot.map(slot => ({
      ...slot,
      available_date_time: generateAvailableSlots(slot.date, slot.start_time, slot.end_time, "0 min", slot.medical_duration),
    }));

    // Create the medical record with initial data
    const medicalRecord = await MedicalMgmt.create({
      job: job_id,
      medical_time_slot: processedTimeSlots,
      address: data.address,
      medicalists: [],
      candidates: [],
    });

    // Process medicalists invites using utility function
    const invitedMedicalists = await batchInviteMedicalists(data.medicalists, job.job_title);

    // Update medicalists list in record
    medicalRecord.medicalists = invitedMedicalists;

    // Save the updated medical record
    await medicalRecord.save();

    res.status(200).json({
      message: "Medical record created, invites sent!!",
      invitedMedicalists: invitedMedicalists.length,
      invitedCandidates: medicalRecord.candidates.length,
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const inviteMedicalCandidates = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required!" });

    const { candidate_ids } = req.body;

    if (!candidate_ids || !Array.isArray(candidate_ids)) return res.status(400).json({ message: "Candidate IDs is required and must be of an array type" });

    const medical = await MedicalMgmt.findOne({ job: job_id }).populate<{ job: { _id: string; job_title: string; employer: { organisation_name: string } } }>({
      path: "job",
      select: "employer job_title",
      populate: {
        path: "employer",
        select: "organisation_name",
      },
    });

    if (!medical) return res.status(404).json({ message: "Medical record not found" });

    const uniqueCandidates = candidate_ids.filter(id => !medical.candidates.some(c => c.candidate.toString() === id.toString()));

    // Send batch invites to candidates
    const successfulCandidateInvites = await batchInviteCandidates(uniqueCandidates, job_id, medical._id, medical.job.job_title, medical.address, userId as string, medical.job.employer.organisation_name);

    // Add candidates to the medical records
    successfulCandidateInvites.forEach(candidateId => {
      medical.candidates.push({
        candidate: candidateId as unknown as Types.ObjectId,
      });
    });

    await medical.save();

    return res.status(200).json({ message: "Candidates invited successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleSubmitMedicalTest = async function (req: IUserRequest, res: Response) {
  try {
    const { candidate_id, job_id } = req.body;
    const medicalFiles = req.files as Express.Multer.File[];

    // Validation
    if (!candidate_id || !job_id) {
      return res.status(400).json({
        message: "Candidate ID and Job ID are required",
      });
    }

    if (!medicalFiles || medicalFiles.length === 0) {
      return res.status(400).json({
        message: "No medical files uploaded",
      });
    }

    // Find the medical record
    const medicalRecord = await MedicalMgmt.findOne({ job: job_id });
    if (!medicalRecord) {
      return res.status(404).json({
        message: "Medical record not found for this job",
      });
    }

    // Find the candidate in the medical record
    const candidateIndex = medicalRecord.candidates.findIndex(candidate => candidate.candidate.toString() === candidate_id);

    if (candidateIndex === -1) {
      return res.status(404).json({
        message: "Candidate not found in medical record",
      });
    }

    // Upload files to Cloudinary and collect results
    const uploadPromises = medicalFiles.map(file => {
      return new Promise<{ fileName: string; url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `medicals/${job_id}/${candidate_id}`,
            resource_type: "auto",
            public_id: `${Date.now()}_${file.originalname.split(".")[0]}`, // Include timestamp to avoid conflicts
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result?.secure_url) {
              resolve({
                fileName: file.originalname,
                url: result.secure_url,
              });
            } else {
              reject(new Error("Failed to get secure URL from Cloudinary"));
            }
          }
        );

        // Create a readable stream from the buffer and pipe it to Cloudinary
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null); // End of stream
        bufferStream.pipe(stream);
      });
    });

    // Wait for all uploads to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Create medical_documents object with filename as key and URL as value
    const medicalDocuments: { [key: string]: string } = {};
    uploadResults.forEach(({ fileName, url }) => {
      medicalDocuments[fileName] = url;
    });

    medicalRecord.candidates[candidateIndex].medical_documents = medicalDocuments;

    // Update status to completed (optional, adjust based on your workflow)
    medicalRecord.candidates[candidateIndex].status = "completed";

    // Save the updated medical record
    await medicalRecord.save();

    res.status(200).json({
      message: "Medical documents uploaded successfully",
      uploadedFiles: uploadResults.map(result => ({
        fileName: result.fileName,
        url: result.url,
      })),
      totalFiles: uploadResults.length,
    });
  } catch (error) {
    console.error("Medical upload error:", error);
    handleErrors({ res, error });
  }
};

export { getJobsForMedical, getCandidatesInvitedForMedicals, setMedicalAvailability, inviteMedicalCandidates, handleSubmitMedicalTest };
