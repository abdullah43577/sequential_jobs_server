import { Schema, model } from "mongoose";
import { ITestSubmission } from "../../utils/types/modelTypes";
import Test from "./test.model";

const testSubmissionSchema = new Schema<ITestSubmission>(
  {
    test: { type: Schema.Types.ObjectId, ref: "Test", required: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },

    answers: [
      {
        question_id: { type: String, required: true },
        selected_answer: { type: String, required: true },
        is_correct: { type: Boolean, default: false },
      },
    ],

    score: { type: Number, default: 0 },
    status: { type: String, enum: ["suitable", "not_suitable", "probable"], default: "not_suitable" },
  },
  { timestamps: true }
);

testSubmissionSchema.pre("save", async function (next) {
  try {
    const test = await Test.findById(this.test);
    if (!test) return next(new Error("Test not found"));

    // Retrieve cutoff points
    const { cut_off_points } = test;
    if (!cut_off_points) return next(new Error("Cutoff points not set for this test"));

    // Assign status based on score
    if (this.score >= (cut_off_points.suitable.min || 0) && this.score <= (cut_off_points.suitable.max || Infinity)) {
      this.status = "suitable";
    } else if (this.score >= (cut_off_points.probable.min || 0) && this.score <= (cut_off_points.probable.max || Infinity)) {
      this.status = "probable";
    } else {
      this.status = "not_suitable";
    }

    next();
  } catch (error: any) {
    next(error);
  }
});

const TestSubmission = model<ITestSubmission>("TestSubmission", testSubmissionSchema);

export default TestSubmission;
