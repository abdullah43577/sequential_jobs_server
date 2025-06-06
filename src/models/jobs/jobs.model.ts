import { Schema, model } from "mongoose";
import { IJob } from "../../utils/types/modelTypes";

const jobSchema = new Schema<IJob>(
  {
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },

    job_title: { type: String, trim: true },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    job_type: { type: String, enum: ["hybrid", "on_site", "remote"] },
    employment_type: { type: String, enum: ["full_time", "part_time", "contract"] },
    salary: { type: Number },
    currency_type: { type: String, enum: ["NGN", "USD", "EUR", "CFA", "GBP", "AUD", "CAD"] },
    years_of_exp: { type: Number },
    payment_frequency: { type: String, enum: ["yearly", "monthly", "weekly"] },
    generic_skills: [{ type: String }],
    technical_skills: [{ type: String }],
    description: { type: String },
    applicants: [
      {
        applicant: { type: Schema.Types.ObjectId, ref: "User", default: null },
        date_of_application: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["applied", "shortlisted", "interview_invite_sent", "interview_scheduled", "interview_completed", "has_offer", "hired", "documents_reupload_requested", "rejected", "medical_scheduled", "medical_completed"],
          default: "applied",
        },
      },
    ],
    application_test: { type: Schema.Types.ObjectId, ref: "Test", default: null },

    // Status fields
    is_live: { type: Boolean, default: false },
    stage: {
      type: String,
      enum: ["job_post_creation", "set_cv_sorting_question", "set_cut_off_points"],
      default: "job_post_creation",
    },
    status: { type: String, enum: ["archived", "flagged", "active"], default: "active" },
  },
  { timestamps: true }
);

const Job = model<IJob>("Job", jobSchema);

export default Job;
