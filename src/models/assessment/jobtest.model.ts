import { Schema, model } from "mongoose";
import { IJobTest } from "../../utils/types/modelTypes";

const JobTestSchema = new Schema<IJobTest>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job_test: { type: Schema.Types.ObjectId, ref: "Test" },

    // Scoring criteria
    cut_off_points: {
      suitable: { min: Number, max: Number, required: true },
      probable: { min: Number, max: Number, required: true },
      not_suitable: { min: Number, max: Number, required: true },
    },

    invitation: { type: String, required: true },
  },
  { timestamps: true }
);

JobTestSchema.pre("validate", function (next) {
  const jobTest = this;

  // Validate cut-off points
  const { suitable, probable, not_suitable } = jobTest.cut_off_points;

  // Validate ranges
  if (suitable.min > suitable.max) {
    return next(new Error("Suitable range: minimum cannot be greater than maximum"));
  }
  if (probable.min > probable.max) {
    return next(new Error("Probable range: minimum cannot be greater than maximum"));
  }
  if (not_suitable.min > not_suitable.max) {
    return next(new Error("Not suitable range: minimum cannot be greater than maximum"));
  }

  // Validate hierarchy
  if (suitable.min <= probable.max || probable.min <= not_suitable.max) {
    return next(new Error("Invalid cut-off point ranges. Ensure suitable > probable > not_suitable"));
  }

  next();
});

const JobTest = model<IJobTest>("JobTest", JobTestSchema);

export default JobTest;
