import { Schema, model } from "mongoose";
import { IJobTest } from "../../utils/types/modelTypes";

const JobTestSchema = new Schema<IJobTest>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job_test: { type: Schema.Types.ObjectId, ref: "Test" },

    stage: { type: String, enum: ["set_test", "set_cutoff", "invitation_upload", "candidate_invite"], default: "set_test" },

    invitation_letter: { type: String, default: "" },
    candidates_invited: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const JobTest = model<IJobTest>("JobTest", JobTestSchema);

export default JobTest;
