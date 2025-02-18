import { Schema, model } from "mongoose";
import { IInterview } from "../../utils/types/modelTypes";

const interviewSchema = new Schema<IInterview>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating_scale: { type: Object, required: true },
    interview_time_slot: [
      {
        date: { type: Date, required: true },
        start_time: { type: String, required: true },
        end_time: { type: String, required: true },
        break_time: { type: String, required: true },
        interview_duration: { type: String, required: true },
        medical_duration: { type: String, required: true },
      },
    ],
    panelists: [{ type: String, default: [] }],
    invitation_letter: { type: String, required: true },
  },
  { timestamps: true }
);

interviewSchema.pre("validate", function (next) {
  next();
});

const InterviewMgmt = model<IInterview>("InterviewMgmt", interviewSchema);

export default InterviewMgmt;
