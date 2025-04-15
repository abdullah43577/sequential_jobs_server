import { application, Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { EmployerInterviewManagementSchema } from "../../utils/types/employerJobsValidatorSchema";
import { generateAvailableSlots } from "../../utils/generateAvailableSlots";
import InterviewMgmt from "../../models/interview/interview.model";
import { handleErrors } from "../../helper/handleErrors";
import { hashPassword } from "../../helper/hashPassword";
import User from "../../models/users.model";
import { generateProfessionalEmail } from "../../utils/nodemailer.ts/email-templates/generateProfessionalEmail";
import { transportMail } from "../../utils/nodemailer.ts/transportMail";
import crypto from "crypto";
import TestSubmission from "../../models/jobs/testsubmission.model";
import { Types } from "mongoose";

//* INTERVIEW MANAGEMENT
const getJobsForInterviews = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const jobs = await Job.find({ employer: userId, is_live: true }).select("job_title salary job_type createdAt").lean();

    //* extract all job ids
    const jobIds = jobs.map(job => job._id);

    const interviews = await InterviewMgmt.find({ job: { $in: jobIds } }).lean();

    const formattedJobs = jobs.map(job => {
      const interviewData = interviews.find(interview => interview.job.toString() === job._id.toString());

      return {
        ...job,
        stage: interviewData?.stage || "set_rating_scale",
        has_created_interview: !!interviewData?.candidates.length,
      };
    });

    res.status(200).json(formattedJobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleCreateInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const data = EmployerInterviewManagementSchema.parse(req.body);

    const interview = await InterviewMgmt.findOne({ job: job_id });
    if (interview) return res.status(200).json({ message: "An interview record already exists in the database" });

    const existingJob = await Job.findById(job_id);
    if (!existingJob) return res.status(404).json({ message: "Job not found!" });

    // Process each interview_time_slot and generate available slots dynamically
    const processedTimeSlots = data.interview_time_slot.map(slot => ({
      ...slot,
      available_date_time: generateAvailableSlots(slot.date, slot.start_time, slot.end_time, slot.break_time, slot.interview_duration),
    }));

    const newInterview = await InterviewMgmt.create({
      job: job_id,
      employer: userId,
      rating_scale: data.rating_scale,
      interview_time_slot: processedTimeSlots,
      meetingLink: data.meetingLink,
      invitation_letter: data.invitation_letter,
      stage: "panelist_letter_invitation",
    });

    return res.status(200).json({ message: "Interview records added", interview_id: newInterview._id });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGetRatingScaleDraft = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("rating_scale").lean();
    if (!interview) return res.status(200).json({ success: false, rating_scale: {} });

    res.status(200).json({ success: true, rating_scale: interview.rating_scale });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGetTimeSlotDrafts = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("interview_time_slot").lean();
    if (!interview) return res.status(200).json({ success: false, interview_time_slots: [] });

    res.status(200).json({ success: true, interview_time_slots: interview.interview_time_slot });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGetInvitationLetter = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("invitation_letter").lean();
    if (!interview) return res.status(200).json({ success: false, invitation_letter: [] });

    res.status(200).json({ success: true, invitation_letter: interview.invitation_letter });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGetPanelistEmails = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("panelists").lean();
    if (!interview) return res.status(200).json({ success: false, emails: [] });

    res.status(200).json({ success: true, emails: interview.panelists });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleInvitePanelists = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const panelists = req.body.panelists as string[];

    if (!panelists || typeof panelists !== "object" || panelists.length === 0) return res.status(400).json({ message: "Panelist emails required!" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).populate<{ job: { _id: string; job_title: string } }>("job", "job_title");
    if (!interview) return res.status(400).json({ message: "Interview not found!" });

    const uniquePanelists = panelists.filter(email => !interview.panelists.includes(email));

    const promises = uniquePanelists.map(async email => {
      try {
        const existingPanelist = await User.findOne({ email }).lean();

        if (!existingPanelist) {
          const tempPassword = crypto.randomBytes(8).toString("hex");
          const hashedPassword = await hashPassword(tempPassword);

          const newPanelist = await User.create({
            email,
            password: hashedPassword,
            role: "panelist",
            isTemporary: true,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          });

          //* send invite email with temporary credentials
          const emailData = {
            type: "invite" as const,
            title: "You've Been Invited as an Interview Panelist",
            recipientName: email,
            message: `You have been selected as a panelist for an upcoming interview for the position of ${interview.job.job_title}. Please click the button below to access the interview panel and review candidate details.
  ${newPanelist.isTemporary ? `\n\nTemporary Account Credentials:\nEmail: ${email}\nPassword: ${tempPassword}\n\nThis account will expire in 7 days. Please change your password after first login.` : ""} \n\n interview id ${interview._id}`,
            buttonText: "Access Interview Panel",
            buttonAction: `https://login?email=${encodeURIComponent(newPanelist.email)}${newPanelist.isTemporary ? "&temp=true" : ""}`,
            additionalDetails: {
              date: "formattedDate",
              time: "formattedTime",
              location: "Virtual Interview",
              organizerName: "Sequential Jobs Team",
            },
          };

          // Generate email HTML
          const { html } = generateProfessionalEmail(emailData);

          const subject = `Panelist Interview Invite - ${interview.job.job_title}`;

          // Send email
          await transportMail({
            email: email,
            subject,
            message: html,
          });

          interview.panelists.push(email);
        }
      } catch (error) {
        console.error(`Error creating and inviting panelist ${email}:`, error);
      }
    });

    await Promise.all(promises);

    // Save the updated interview document in bulk
    interview.stage = "panelist_invite_confirmation";
    await interview.save();

    return res.status(200).json({ message: "Panelists Invited Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGetCandidates = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const testSubmissions = await TestSubmission.find({ job: job_id })
      .select("test job applicant")
      .populate<{ test: { type: "application_test" | "job_test" } }>({
        path: "test",
        select: "type",
      })
      .populate<{ job: { job_title: string; applicants: { _id: string; applicant: Types.ObjectId; date_of_application: Date; status: string }[] } }>("job", "job_title applicants")
      .populate<{ applicant: { _id: string; first_name: string; last_name: string; resume: string } }>("applicant", "first_name last_name resume")
      .lean();

    if (!testSubmissions) return res.status(400).json({ message: "Error fetching candidates with test submissions" });

    const applicationTestOnlyCandidates = testSubmissions.filter(sub => sub.test.type === "application_test");

    const jobTestOnlyCandidates = testSubmissions.filter(sub => sub.test.type === "job_test");

    const formatResponse = function (arr: any[]) {
      return arr.map(sub => {
        const applicantId = sub.applicant._id.toString();
        const dataEntry = sub.job.applicants.find((app: any) => app.applicant.toString() === applicantId);

        return {
          candidate_name: `${sub.applicant.first_name} ${sub.applicant.last_name}`,
          date_of_application: dataEntry?.date_of_application,
          role_applied_for: sub.job.job_title,
          resume: sub.applicant.resume,
          status: dataEntry?.status,
        };
      });
    };

    const applicationTestCandidates = formatResponse(applicationTestOnlyCandidates);
    const jobTestCandidates = formatResponse(jobTestOnlyCandidates);

    res.status(200).json({ applicationTestCandidates, jobTestCandidates });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleInviteCandidates = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const { candidate_ids } = req.body;

    if (!candidate_ids || !Array.isArray(candidate_ids)) return res.status(400).json({ message: "Candidate IDs is required and must be of an array type" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).populate<{ job: { _id: string; job_title: string } }>("job", "job_title");
    if (!interview) return res.status(400).json({ message: "Interview not found!" });

    const uniqueCandidates = candidate_ids.filter(id => !interview.candidates.includes(id));

    const promises = uniqueCandidates.map(async id => {
      try {
        const existingUser = await User.findById(id);
        if (!existingUser) return;

        //* send invite email with temporary credentials
        const emailData = {
          type: "invite" as const,
          title: "You've Been Invited as an Interview Panelist",
          recipientName: `${existingUser.first_name} ${existingUser.last_name}`,
          message: `You have been invited for an upcoming interview for the position of ${interview.job.job_title}. Please click the button below to access the interview panel and set your available date and time`,
          buttonText: "Access Interview Panel",
          buttonAction: `https://login?email=${encodeURIComponent(existingUser.email)}${existingUser.isTemporary ? "&temp=true" : ""}`,
          additionalDetails: {
            date: "formattedDate",
            time: "formattedTime",
            location: "Virtual Interview",
            organizerName: "Sequential Jobs Team",
          },
        };

        // Generate email HTML
        const { html } = generateProfessionalEmail(emailData);

        const subject = `Candidate Interview Invite - ${interview.job.job_title}`;

        // Send email
        await transportMail({
          email: existingUser.email,
          subject,
          message: html,
        });

        interview.candidates.push({ candidate: id });

        //* update candidate status
        await Job.findOneAndUpdate(
          { _id: job_id, "applicants.applicant": id },
          {
            $set: {
              "applicants.$.status": "interview_invite_sent",
            },
          }
        );
      } catch (error) {
        console.error(`Error inviting candidate ${id}:`, error);
      }
    });

    await Promise.all(promises);

    //* save candidates record
    interview.stage = "applicants_invite";
    await interview.save();

    return res.status(200).json({ message: "Candidates invited successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGradeCandidates = async function (req: IUserRequest, res: Response) {
  try {
    const { interview_id, graded_scale, candidate_id } = req.body;

    if (!interview_id) return res.status(400).json({ message: "Interview ID is required" });

    if (!graded_scale || typeof graded_scale !== "object" || Object.keys(graded_scale).length === 0) {
      return res.status(400).json({ message: "Graded scale is required!" });
    }

    const interview = await InterviewMgmt.findById(interview_id);
    if (!interview) return res.status(404).json({ message: "Interview record not found!" });

    // Find the specific candidate in the interview
    const candidateEntry = interview.candidates.find(c => c.candidate.toString() === candidate_id);

    if (!candidateEntry) {
      return res.status(404).json({ message: "Candidate not found in this interview!" });
    }

    // ✅ Validate that the grading criteria match the global rating scale
    const globalCriteria = Array.from(interview.rating_scale.keys());
    for (const key of Object.keys(graded_scale)) {
      if (!globalCriteria.includes(key)) {
        return res.status(400).json({ message: `Invalid rating criterion: ${key}` });
      }
    }

    // ✅ Store actual ratings in the candidate's rating scale
    for (const [key, value] of Object.entries(graded_scale)) {
      candidateEntry.rating_scale?.set(key, Number(value));
    }

    await interview.save();

    res.status(200).json({ message: "Candidate Graded Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getJobsForInterviews, handleCreateInterview, handleGetRatingScaleDraft, handleGetTimeSlotDrafts, handleGetInvitationLetter, handleGetPanelistEmails, handleInvitePanelists, handleGetCandidates, handleInviteCandidates, handleGradeCandidates };
