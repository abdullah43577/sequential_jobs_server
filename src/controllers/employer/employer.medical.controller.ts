import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import Job from "../../models/jobs/jobs.model";
import { EmployerMedicalsManagementSchema } from "../../utils/types/employerJobsValidatorSchema";
import MedicalMgmt from "../../models/medicals/medical.model";
import { generateAvailableSlots } from "../../utils/generateAvailableSlots";
import User from "../../models/users.model";
import { hashPassword } from "../../helper/hashPassword";
import crypto from "crypto";
import { guessNameFromEmail } from "../../utils/guessNameFromEmail";
import { generateProfessionalEmail } from "../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../utils/nodemailer.ts/transportMail";

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
        role_applied_for: job.job_title,
        candidate_name: `${app.applicant.first_name} ${app.applicant.last_name}`,
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
    const { job_id } = req.query;
    const data = EmployerMedicalsManagementSchema.parse(req.body);

    if (!job_id) return res.status(200).json({ message: "Job ID is required" });

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job not found!" });

    const existingMedicals = await MedicalMgmt.findOne({ job: job_id });
    if (existingMedicals) return res.status(200).json({ message: "A Medical record for the specified job already exists." });

    const processedTimeSlots = data.medical_time_slot.map(slot => ({
      ...slot,
      available_date_time: generateAvailableSlots(slot.date, slot.start_time, slot.end_time, slot.break_time, slot.medical_duration),
    }));

    const invitedMedicalists: string[] = [];

    await Promise.all(
      data.medicalists.map(async email => {
        try {
          const existingMedicalist = await User.findOne({ email }).lean();

          if (!existingMedicalist) {
            const tempPassword = crypto.randomBytes(8).toString("hex");
            const hashedPassword = await hashPassword(tempPassword);

            const nameGuess = guessNameFromEmail(email);

            const newMedicalist = await User.create({
              first_name: nameGuess.firstName || "Guest",
              last_name: "medicalist",
              email,
              password: hashedPassword,
              role: "medical-expert",
              isTemporary: true,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            });

            //* send invite email with temporary credentials
            const emailData = {
              type: "invite" as const,
              title: "You've Been Invited as a Medical Examiner",
              recipientName: nameGuess.firstName || "Guest",
              message: `You have been selected to conduct a medical examination for a candidate applying for the position of ${job.job_title}. Please click the button below to access the examination panel and review candidate details.

Temporary Account Credentials:
Email: ${email}
Password: ${tempPassword}

This account will expire in 7 days. Please change your password after first login.`,
              buttonText: "Access Examination Panel",
              buttonAction: `https://login?email=${encodeURIComponent(email)}&temp=true`,
              additionalDetails: {
                date: "formattedDate",
                time: "formattedTime",
                location: "Medical Evaluation (Virtual/In-person)",
                organizerName: "Sequential Jobs Medical Team",
              },
            };

            // Generate email HTML
            const { html } = generateProfessionalEmail(emailData);

            const subject = `Panelist Interview Invite - ${job.job_title}`;

            // Send email
            await transportMail({
              email: email,
              subject,
              message: html,
            });

            invitedMedicalists.push(email);
          }
        } catch (error) {
          console.error(`Error creating and inviting medical expert ${email}:`, error);
        }
      })
    );

    await MedicalMgmt.create({
      job: job_id,
      medical_time_slot: processedTimeSlots,
      address: data.address,
      medicalists: invitedMedicalists,
    });

    res.status(200).json({ message: "Medical record created, invites sent!!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsForMedical, setMedicalSchedule };
