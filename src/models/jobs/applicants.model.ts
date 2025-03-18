import { model, Schema, Types } from "mongoose";

interface ApplicantSchema {
  user: Types.ObjectId;
  job_id: Types.ObjectId;
  cv: string;
  applied_at: Date;
}

const applicantSchema = new Schema<ApplicantSchema>({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  job_id: { type: Schema.Types.ObjectId, ref: "Job" },
  cv: { type: String, required: true },
  applied_at: { type: Date, default: Date.now() },
});

const Applicant = model<ApplicantSchema>("Applicant", applicantSchema);

export default Applicant;
