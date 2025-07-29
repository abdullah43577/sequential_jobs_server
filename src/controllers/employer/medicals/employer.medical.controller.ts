import { Response } from "express";
import { IUserRequest } from "../../../interface";
import { handleErrors } from "../../../helper/handleErrors";
import Job from "../../../models/jobs/jobs.model";
import { EmployerMedicalsManagementSchema } from "../../../utils/types/employerJobsValidatorSchema";
import MedicalMgmt from "../../../models/medicals/medical.model";
import { generateAvailableSlots } from "../../../utils/generateAvailableSlots";
import User from "../../../models/users.model";
import cloudinary from "../../../utils/cloudinaryConfig";
import { Readable } from "stream";
import { MedicalistInviteData } from "../../../utils/services/emails/medicalistInviteEmailService";
import crypto from "crypto";
import { hashPassword } from "../../../helper/hashPassword";
import { guessNameFromEmail } from "../../../utils/guessNameFromEmail";
import { queueBulkEmail } from "../../../workers/globalEmailQueueHandler";
import { JOB_KEY } from "../../../workers/registerWorkers";
import { createAndSendNotification } from "../../../utils/services/notifications/sendNotification";
import { NotificationStatus, NotificationType } from "../../../models/notifications.model";
import { CandidateMedicalData } from "../../../utils/services/emails/candidateMedicalEmailInvite";

const { CLIENT_URL } = process.env;

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

    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job not found!" });

    // Get employer info for notifications
    const employer = await User.findById(userId).select("organisation_name").lean();
    if (!employer) return res.status(404).json({ message: "Employer not found" });

    const existingMedicals = await MedicalMgmt.findOne({ job: job_id }).lean();
    if (existingMedicals) return res.status(200).json({ message: "A Medical record for the specified job already exists." });

    // Search for medicalists existence across DB
    const existingMedicalistsInDB = await User.find({ email: { $in: data.medicalists } })
      .select("email first_name")
      .lean();

    const medicalistsAlreadyInDB = new Set(existingMedicalistsInDB.map(med => med.email));

    // Medicalists not in DB - need to create new accounts
    const uniqueMedicalists = data.medicalists.filter(email => !medicalistsAlreadyInDB.has(email));

    // Medicalists already in DB - collect them for processing
    const existingDBMedicalists: string[] = [];

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

    // Process existing medicalists in DB
    data.medicalists.forEach(med => {
      if (medicalistsAlreadyInDB.has(med)) {
        existingDBMedicalists.push(med);
        medicalRecord.medicalists.push(med);
      }
    });

    // Process new medicalists (create users concurrently)
    let newMedicalistEmailData: MedicalistInviteData[] = [];

    if (uniqueMedicalists.length > 0) {
      const medicalistCreationResults = await Promise.allSettled(
        uniqueMedicalists.map(async email => {
          const tempPassword = crypto.randomBytes(8).toString("hex");
          const hashedPassword = await hashPassword(tempPassword);
          const nameGuess = guessNameFromEmail(email);

          const newMedicalist = await User.create({
            first_name: nameGuess.firstName || "Guest",
            last_name: "medicalist",
            email,
            password: hashedPassword,
            role: "medical-expert",
            has_validated_email: true,
            isTemporary: true,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          });

          return {
            email,
            emailData: {
              email,
              recipientName: nameGuess.firstName || "Guest",
              jobTitle: job.job_title,
              isNewMedicalist: true,
              tempPassword,
              isTemporary: newMedicalist.isTemporary,
            },
          };
        })
      );

      // Process successful user creations
      medicalistCreationResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          medicalRecord.medicalists.push(result.value.email);
          newMedicalistEmailData.push(result.value.emailData as MedicalistInviteData);
        } else {
          console.error(`Error creating medicalist ${uniqueMedicalists[index]}:`, result.reason);
        }
      });
    }

    // Process existing medicalists (prepare email data concurrently)
    let existingMedicalistEmailData: MedicalistInviteData[] = [];

    if (existingDBMedicalists.length > 0) {
      const existingMedicalistResults = await Promise.allSettled(
        existingDBMedicalists.map(async email => {
          const existingUser = await User.findOne({ email }).lean();
          const nameGuess = existingUser ? { firstName: existingUser.first_name } : guessNameFromEmail(email);

          return {
            email,
            emailData: {
              email,
              recipientName: nameGuess.firstName || "Guest",
              jobTitle: job.job_title,
              isNewMedicalist: false,
            },
          };
        })
      );

      // Process successful existing medicalist data
      existingMedicalistResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          existingMedicalistEmailData.push(result.value.emailData as MedicalistInviteData);
        } else {
          console.error(`Error processing existing medicalist ${existingDBMedicalists[index]}:`, result.reason);
        }
      });
    }

    // Bulk email operations
    const emailPromises: Promise<any>[] = [];

    if (newMedicalistEmailData.length > 0) {
      emailPromises.push(queueBulkEmail(JOB_KEY.MEDICALIST_INVITE, newMedicalistEmailData));
    }

    if (existingMedicalistEmailData.length > 0) {
      emailPromises.push(queueBulkEmail(JOB_KEY.MEDICALIST_INVITE, existingMedicalistEmailData));
    }

    // Execute bulk email operations concurrently
    if (emailPromises.length > 0) {
      await Promise.all(emailPromises);
    }

    // Save the updated medical record
    await medicalRecord.save();

    return res.status(200).json({
      message: "Medicalists invitation process initiated successfully",
      totalInvites: newMedicalistEmailData.length + existingMedicalistEmailData.length,
      breakdown: {
        newMedicalists: newMedicalistEmailData.length,
        existingMedicalists: existingMedicalistEmailData.length,
        totalProcessed: uniqueMedicalists.length + existingDBMedicalists.length,
      },
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

    // invite users concurrently
    let processedCandidateData: CandidateMedicalData[] = [];

    if (uniqueCandidates.length > 0) {
      const actionResult = await Promise.allSettled(
        uniqueCandidates.map(async id => {
          const existingUser = await User.findById(id);

          //* update candidate status
          await Job.findOneAndUpdate(
            { _id: job_id, "applicants.applicant": id },
            {
              $set: {
                "applicants.$.status": "medical_invite_sent",
              },
            }
          );

          const subject = `Medical Assessment Invitation - ${medical.job.job_title}`;
          const message = `${medical.job.employer.organisation_name} has invited you to schedule a medical assessment for ${medical.job.job_title} position.`;

          //*CREATE AND SEND NOTIFICATION
          await createAndSendNotification({
            recipient: id,
            sender: userId as string,
            type: NotificationType.MESSAGE,
            title: subject,
            message,
            status: NotificationStatus.UNREAD,
          });

          // Create invite link and expiration date
          const medicalInviteLink = `${CLIENT_URL}/dashboard/job-seeker/medicals/schedule_medicals?job_id=/${medical._id}`;
          const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Expires in 7 days

          return {
            candidateId: id,
            emailData: {
              email: existingUser?.email,
              first_name: existingUser?.first_name,
              last_name: existingUser?.last_name,
              jobTitle: medical.job.job_title,
              expirationDate,
              medicalInviteLink,
              address: medical.address,
              employerOrgName: medical.job.employer.organisation_name,
            },
          };
        })
      );

      //* predictable candidate push and email data collector
      actionResult.forEach((result, index) => {
        if (result.status === "fulfilled") {
          medical.candidates.push({ candidate: result.value.candidateId });
          processedCandidateData.push(result.value?.emailData as CandidateMedicalData);
        } else {
          console.error(`Error inviting candidate ${uniqueCandidates[index]}:`, result.reason);
        }
      });
    }

    if (processedCandidateData.length > 0) {
      await queueBulkEmail(JOB_KEY.MEDICALIST_CANDIDATE_INVITE, processedCandidateData);
    }

    //* save candidates record
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
