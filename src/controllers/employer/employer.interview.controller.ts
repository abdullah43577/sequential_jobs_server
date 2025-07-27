import { Response } from "express";
import { IUserRequest } from "../../interface";
import Job from "../../models/jobs/jobs.model";
import { EmployerInterviewManagementSchema, PanelistGradeCandidate } from "../../utils/types/employerJobsValidatorSchema";
import { generateAvailableSlots } from "../../utils/generateAvailableSlots";
import InterviewMgmt from "../../models/interview/interview.model";
import { handleErrors } from "../../helper/handleErrors";
import { hashPassword } from "../../helper/hashPassword";
import User from "../../models/users.model";
import crypto from "crypto";
import TestSubmission from "../../models/jobs/testsubmission.model";
import { Types } from "mongoose";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";
import { guessNameFromEmail } from "../../utils/guessNameFromEmail";
import { sendCandidateInviteEmail } from "../../utils/services/emails/interviewCandidatesEmailService";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { queueEmail } from "../../workers/globalEmailQueueHandler";
import { JOB_KEY } from "../../workers/registerWorkers";

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

const getCandidatesInvitedForInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { job_id } = req.query;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("candidates").populate<{
      candidates: { candidate: { first_name: string; last_name: string; phone_no: string; resume: string; profile_pic: string; email: string }; interview_score: number }[];
    }>("candidates.candidate", "first_name last_name phone_no resume profile_pic email");

    if (!interview) return res.status(404).json({ message: "Interview Record not found!" });

    const formattedResponse = interview?.candidates.map(cd => ({
      name: `${cd.candidate.first_name} ${cd.candidate.last_name}`,
      phone_no: cd.candidate.phone_no,
      resume: cd.candidate.resume,
      interview_score: cd.interview_score,
      profile_pic: cd.candidate.profile_pic,
      email: cd.candidate.email,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleCreateInterview = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { job_id } = req.query;
    const data = EmployerInterviewManagementSchema.parse(req.body);

    if (!job_id) return res.status(200).json({ message: "Job ID is required" });

    const existingInterview = await InterviewMgmt.findOne({ job: job_id });
    if (existingInterview) return res.status(200).json({ message: "An interview record already exists in the database" });

    const job = await Job.findById(job_id);
    if (!job) return res.status(404).json({ message: "Job not found!" });

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

    const interview = await InterviewMgmt.findOne({ job: job_id }).select("interview_time_slot meetingLink").lean();
    if (!interview) return res.status(200).json({ success: false, interview_time_slots: [] });

    res.status(200).json({ success: true, interview_time_slots: interview.interview_time_slot, meetingLink: interview.meetingLink });
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
    if (!interview || interview?.panelists?.length === 0) {
      return res.status(200).json({ success: false, emails: [] });
    }

    const panelistEmails = interview.panelists.map(pan => pan.email);

    res.status(200).json({ success: true, emails: panelistEmails });
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

    //* search for panelists existence across DB
    const existingPanelistsInDB = await User.find({ email: { $in: panelists } })
      .select("email first_name")
      .lean();

    const panelistsAlreadyInDB = new Set(existingPanelistsInDB.map(pan => pan.email));
    const interviewPanelists = new Set(interview.panelists.map(pan => pan.email));

    //* panelists not in DB and haven't been added to this interview before
    const uniquePanelists = panelists.filter(email => !panelistsAlreadyInDB.has(email) && !interviewPanelists.has(email));

    //* panelists that match what's stored in DB for current interview with data sent to this controller
    const existingPanelists = panelists.filter(email => interviewPanelists.has(email));

    //* panelists already in DB for different jobs should be merged with existingPanelists if the email was also sent across
    panelists.forEach(pan => {
      if (panelistsAlreadyInDB.has(pan) && !existingPanelists.includes(pan)) {
        existingPanelists.push(pan);

        const rating_scale_keys = Array.from(interview.rating_scale.keys());
        const newScale = new Map<string, string | number>();

        rating_scale_keys.forEach(key => newScale.set(key, ""));

        interview.panelists.push({ email: pan, rating_scale: newScale });
      }
    });

    // Process new panelists (create users first, then queue emails)
    if (uniquePanelists.length > 0) {
      for (const email of uniquePanelists) {
        try {
          const tempPassword = crypto.randomBytes(8).toString("hex");
          const hashedPassword = await hashPassword(tempPassword);

          const nameGuess = guessNameFromEmail(email);

          const newPanelist = await User.create({
            first_name: nameGuess.firstName || "Guest",
            last_name: "panelist",
            email,
            password: hashedPassword,
            role: "panelist",
            has_validated_email: true,
            isTemporary: true,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          });

          // Queue the email job (no delay needed as worker handles rate limiting)
          await queueEmail(JOB_KEY.PANELIST_INVITE, {
            email,
            recipientName: nameGuess.firstName || "Guest",
            jobTitle: interview.job.job_title,
            isNewPanelist: true,
            tempPassword,
            isTemporary: newPanelist.isTemporary,
          });

          const rating_scale_keys = Array.from(interview.rating_scale.keys());
          const newScale = new Map<string, string | number>();

          rating_scale_keys.forEach(key => newScale.set(key, ""));

          interview.panelists.push({ email: email, rating_scale: newScale });
        } catch (error) {
          console.error(`Error creating panelist ${email}:`, error);
        }
      }
    }

    // Process existing panelists (queue emails)
    if (existingPanelists.length > 0) {
      for (const email of existingPanelists) {
        try {
          const existingUser = await User.findOne({ email }).lean();
          const nameGuess = existingUser ? { firstName: existingUser.first_name } : guessNameFromEmail(email);

          await queueEmail(JOB_KEY.PANELIST_INVITE, {
            email,
            recipientName: nameGuess.firstName || "Guest",
            jobTitle: interview.job.job_title,
            isNewPanelist: false,
          });
        } catch (error) {
          console.error(`Error queuing notification for existing panelist ${email}:`, error);
        }
      }
    }

    // Save the updated interview document
    interview.stage = "panelist_invite_confirmation";
    await interview.save();

    // Return success response immediately (emails will be sent asynchronously)
    return res.status(200).json({
      message: "Panelists invitation process initiated successfully",
      totalInvites: uniquePanelists.length + existingPanelists.length,
    });
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
          applicant_id: applicantId,
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
    const { userId } = req;
    const { job_id } = req.params;
    if (!job_id) return res.status(400).json({ message: "Job ID is required" });

    const { candidate_ids } = req.body;

    if (!candidate_ids || !Array.isArray(candidate_ids)) return res.status(400).json({ message: "Candidate IDs is required and must be of an array type" });

    const interview = await InterviewMgmt.findOne({ job: job_id }).populate<{ job: { _id: string; job_title: string; employer: { organisation_name: string } } }>({
      path: "job",
      select: "employer job_title",
      populate: {
        path: "employer",
        select: "organisation_name",
      },
    });
    if (!interview) return res.status(404).json({ message: "Interview not found!" });

    const uniqueCandidates = candidate_ids.filter(id => !interview.candidates.some(c => c.candidate.toString() === id.toString()));

    const promises = uniqueCandidates.map(async id => {
      try {
        const existingUser = await User.findById(id);
        if (!existingUser) return;

        //* send invite email
        await sendCandidateInviteEmail({
          email: existingUser.email,
          recipientName: `${existingUser.first_name} ${existingUser.last_name}`,
          jobTitle: interview.job.job_title,
          isTemporary: existingUser.isTemporary,
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

        const subject = `Candidate Interview Invite - ${interview.job.job_title}`;
        const message = `${interview.job.employer.organisation_name} has invited you for an interview.`;

        //*CREATE AND SEND NOTIFICATION
        await createAndSendNotification({ recipient: id, sender: userId as string, type: NotificationType.MESSAGE, title: subject, message, status: NotificationStatus.UNREAD });

        return;
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

const handleFetchRatingDetailsForPanelists = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const { candidateId, jobId } = req.body;
    if (!candidateId || !jobId) return res.status(400).json({ message: "Candidate and Job ID is required!" });

    const interview = await InterviewMgmt.findOne({ job: jobId }).select("rating_scale meetingLink").lean();
    if (!interview) return res.status(404).json({ message: "Interview not found!" });

    const user = await User.findById(userId);

    const formattedResponse = {
      rating_scale: interview.rating_scale,
      meetingLink: interview.meetingLink,
      panelist: user?.email,
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleGradeCandidate = async function (req: IUserRequest, res: Response) {
  try {
    const { panelist_email, candidate_id, job_id, rating_scale, remark } = PanelistGradeCandidate.parse(req.body);

    const interview = await InterviewMgmt.findOne({ job: job_id });
    if (!interview) return res.status(404).json({ message: "Interview Record not found!" });

    const panelistEntry = interview.panelists.find(panelist => panelist.email === panelist_email);
    if (!panelistEntry) return res.status(400).json({ message: "Panelist Record not found!" });

    // Prevent regrading
    if ([...panelistEntry.rating_scale.values()].some(v => v !== "" && v !== null && v !== undefined)) {
      return res.status(400).json({ message: "You have already graded this candidate." });
    }

    // Assign grades to panelist
    panelistEntry.rating_scale = new Map(Object.entries(rating_scale));
    if (remark?.trim().length) panelistEntry.remark = remark;

    const candidateEntry = interview.candidates.find(c => c.candidate.toString() === candidate_id);
    if (!candidateEntry) return res.status(400).json({ message: "Candidate Entry not found" });

    // Calculate average per scale key across all panelists
    const scaleKeys = Array.from(interview.rating_scale.keys());

    const totalScores: Record<string, number> = {};
    const ratingCounts: Record<string, number> = {};

    scaleKeys.forEach(key => {
      totalScores[key] = 0;
      ratingCounts[key] = 0;
    });

    interview.panelists.forEach(p => {
      scaleKeys.forEach(key => {
        const value = p.rating_scale.get(key);
        if (value !== "" && !isNaN(Number(value))) {
          totalScores[key] += Number(value);
          ratingCounts[key] += 1;
        }
      });
    });

    const averageRatingScale = new Map<string, number>();
    scaleKeys.forEach(key => {
      const average = ratingCounts[key] > 0 ? totalScores[key] / ratingCounts[key] : 0;
      averageRatingScale.set(key, parseFloat(average.toFixed(1)));
    });

    candidateEntry.rating_scale = averageRatingScale;

    // Calculate total interview score (optional)
    const totalScore = Array.from(averageRatingScale.values()).reduce((acc, val) => acc + val, 0);
    candidateEntry.interview_score = parseFloat(totalScore.toFixed(1));

    await interview.save();

    //* delete panelist account on grade successful

    return res.status(200).json({ message: "Candidate graded successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export {
  getJobsForInterviews,
  getCandidatesInvitedForInterview,
  handleCreateInterview,
  handleGetRatingScaleDraft,
  handleGetTimeSlotDrafts,
  handleGetInvitationLetter,
  handleGetPanelistEmails,
  handleInvitePanelists,
  handleGetCandidates,
  handleInviteCandidates,
  handleFetchRatingDetailsForPanelists,
  handleGradeCandidate,
};
