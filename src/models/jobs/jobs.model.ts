import { Schema, model } from "mongoose";
import { IJob } from "../../utils/types/modelTypes";
import { EXPERIENCE_LEVELS, JOB_CATEGORIES } from "../../utils/jobsHelper";

const jobSchema = new Schema<IJob>(
  {
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },

    job_title: { type: String, trim: true },
    job_category: { type: String, enum: JOB_CATEGORIES, required: true },
    required_experience_level: {
      type: String,
      enum: EXPERIENCE_LEVELS,
      required: true,
    },
    // country: { type: String },
    // state: { type: String },
    // city: { type: String },
    locations: [
      {
        country: { type: String },
        state: { type: String },
        city: { type: String },
      },
    ],
    job_type: { type: String, enum: ["hybrid", "on_site", "remote"] },
    employment_type: { type: String, enum: ["full_time", "part_time", "contract"] },
    salary: { type: Number },
    currency_type: { type: String, enum: ["NGN", "USD", "EUR", "CFA", "GBP", "AUD", "CAD"] },
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
          enum: ["applied", "shortlisted", "interview_invite_sent", "interview_scheduled", "interview_completed", "has_offer", "hired", "documents_reupload_requested", "rejected", "medical_invite_sent", "medical_scheduled", "medical_completed"],
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
