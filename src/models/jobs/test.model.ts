import { Schema, model } from "mongoose";
import { ITest } from "../../utils/types/modelTypes";

const testSchema = new Schema<ITest>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    instruction: { type: String, required: true },
    questions: [
      {
        question: { type: String, required: true },
        options: { type: [String], default: [] },
        question_type: { type: String, enum: ["multiple_choice", "yes/no", "text"], required: true },
        score: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

testSchema.pre("validate", function (next) {
  if (!this.questions || this.questions.length === 0) {
    return next(new Error("Test must have at least one question"));
  }

  // Validate each question
  for (const question of this.questions) {
    // For multiple choice questions, ensure options are provided
    if (question.question_type === "multiple_choice" && (!question.options || question.options.length < 2)) {
      return next(new Error("Multiple choice questions must have at least 2 options"));
    }

    // Validate score is positive
    if (question.score <= 0) {
      return next(new Error("Question score must be greater than 0"));
    }
  }

  next();
});

const Test = model<ITest>("Test", testSchema);

export default Test;
