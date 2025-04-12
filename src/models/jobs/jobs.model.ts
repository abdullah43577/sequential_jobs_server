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
        applicant: { type: Schema.Types.ObjectId, ref: "User", default: [] },
        date_of_application: { type: Date, default: Date.now },
        has_taken_application_test: { type: Boolean, default: false },
        status: { type: String, enum: ["applied", "shortlisted", "interview_scheduled", "interview_completed", "offer_sent", "hired", "rejected"], default: "applied" },
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
  },
  { timestamps: true }
);

// jobSchema.pre("validate", function (next) {
//   const job = this;

//   // Common validations for all stages
//   if (!job.employer) return next(new Error("Employer is required."));

//   // Stage 1: Basic job details
//   if (job.stage === "job_post_creation") {
//     const requiredFields = [
//       { field: "job_title", name: "Job title" },
//       { field: "country", name: "Country" },
//       { field: "state", name: "State" },
//       { field: "city", name: "City" },
//       { field: "job_type", name: "Job type" },
//       { field: "employment_type", name: "Employment type" },
//       { field: "salary", name: "Salary" },
//       { field: "currency_type", name: "Currency type" },
//       { field: "years_of_exp", name: "Years of experience" },
//       { field: "generic_skills", name: "Generic Skills" },
//       { field: "technical_skills", name: "Technical Skills" },
//       { field: "description", name: "Job Description" },
//     ];

//     for (const { field, name } of requiredFields) {
//       if (job[field as keyof IJob] == null || job[field as keyof IJob] === "" || (Array.isArray([job[field as keyof IJob]]) && (job[field as keyof IJob] as string[]).length === 0)) {
//         return next(new Error(`${name} is required.`));
//       }
//     }
//   }

//   // Stage 2: CV sorting criteria
//   if (job.stage === "set_cv_sorting_question" && !job.application_test) {
//     return next(new Error("Application test is required for this stage."));
//   }

//   // Stage 3: Cut-off points
//   if (job.stage === "set_cut_off_points") {
//     const { suitable, probable, not_suitable } = job.cut_off_points || {};

//     // Validate presence of all cut-off points
//     if (!suitable?.min != null || !suitable?.max != null) {
//       return next(new Error("Cut-off points for 'suitable' are required."));
//     }
//     if (!probable?.min != null || !probable?.max != null) {
//       return next(new Error("Cut-off points for 'probable' are required."));
//     }
//     if (!not_suitable?.min != null || !not_suitable?.max != null) {
//       return next(new Error("Cut-off points for 'not_suitable' are required."));
//     }

//     // Validate ranges
//     if (suitable.min <= probable.max || probable.min <= not_suitable.max) {
//       return next(new Error("Invalid cut-off point ranges. Ensure suitable > probable > not_suitable."));
//     }

//     // Validate individual ranges
//     if (suitable.min > suitable.max) {
//       return next(new Error("Suitable range min cannot be greater than max."));
//     }
//     if (probable.min > probable.max) {
//       return next(new Error("Probable range min cannot be greater than max."));
//     }
//     if (not_suitable.min > not_suitable.max) {
//       return next(new Error("Not suitable range min cannot be greater than max."));
//     }
//   }

//   next();
// });

const Job = model<IJob>("Job", jobSchema);

export default Job;
