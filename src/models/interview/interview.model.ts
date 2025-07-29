import { Schema, model } from "mongoose";
import { IInterview } from "../../utils/types/modelTypes";

const interviewSchema = new Schema<IInterview>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating_scale: { type: Map, of: Number, required: true },
    interview_time_slot: [
      {
        date: { type: Date, required: true },
        start_time: { type: String, required: true },
        end_time: { type: String, required: true },
        break_time: { type: String, required: true },
        interview_duration: { type: String, required: true },
        available_date_time: [{ type: Object, required: true }],
      },
    ],
    meetingLink: { type: String, required: true },
    panelists: [{ type: String, required: true }],
    invitation_letter: { type: String, required: true },
    candidates: [
      {
        candidate: { type: Schema.Types.ObjectId, ref: "User", required: true },
        scheduled_date_time: {
          type: Object,
          default: {},
        },
        interview_score: { type: Number, default: null },
        status: {
          type: String,
          enum: ["pending", "confirmed", "completed", "canceled"],
          default: "pending",
        },

        //* total average across all gradings
        rating_scale: { type: Map, of: Number, required: true, default: {} },

        //* each panelists rating per candidate goes here
        panelist_ratings: [
          {
            panelist_email: { type: String, required: true },
            rating_scale: { type: Map, of: Schema.Types.Mixed, required: true },
            remark: { type: String, default: "" },
          },
        ],
      },
    ],
    stage: { type: String, enum: ["set_rating_scale", "set_interview", "panelist_letter_invitation", "panelist_invite_confirmation", "applicants_invite"], default: "set_rating_scale" },
  },
  { timestamps: true }
);

const InterviewMgmt = model<IInterview>("InterviewMgmt", interviewSchema);

export default InterviewMgmt;
