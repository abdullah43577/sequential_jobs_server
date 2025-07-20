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

const getJobsForMedical = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId, is_live: true })
      .select("job_title applicants")
      .populate<{ applicants: { applicant: { _id: string; first_name: string; last_name: string; resume: string }; date_of_application: string; status: string }[] }>({
        path: "applicants.applicant",
        select: "first_name last_name resume",
      })
      .lean();

    const jobIds = jobs.map(job => job._id);

    const medicals = await MedicalMgmt.find({ job: { $in: jobIds } });

    const formattedResponse = jobs.flatMap(job => {
      const medicalData = medicals.find(medical => medical.job.toString() === job._id.toString());

      return job.applicants.map(app => ({
        job_id: job._id,
        role_applied_for: job.job_title,
        candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
        candidate_id: app.applicant._id,
        date_of_application: app.date_of_application,
        resume: app.applicant.resume,
        decision: app.status,
        has_created_medical: !!medicalData?.candidates?.length,
      }));
    });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const setMedicalSchedule = async function (req: IUserRequest, res: Response) {
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

    // Send batch invites to candidates
    const successfulCandidateInvites = await batchInviteCandidates(data.candidate_ids, medicalRecord._id, job.job_title, data.address, userId as string, employer.organisation_name);

    // Add candidates to the medical record
    successfulCandidateInvites.forEach(candidateId => {
      medicalRecord.candidates.push({
        candidate: candidateId as unknown as Types.ObjectId,
      });
    });

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

export { getJobsForMedical, setMedicalSchedule };
