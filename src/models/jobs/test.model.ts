import { Schema, model } from "mongoose";
import { ITest } from "../../utils/types/modelTypes";
import { v4 as uuidv4 } from "uuid";

const testSchema = new Schema<ITest>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    instruction: { type: String, required: true, trim: true },
    questions: [
      {
        _id: { type: String, default: uuidv4 },
        question: { type: String, required: true, trim: true },
        options: { type: [String], default: [] },
        question_type: { type: String, enum: ["multiple_choice", "yes/no", "text"], required: true },
        score: { type: Number, required: true },
        correct_answer: { type: String, default: null },
      },
    ],

    type: { type: String, enum: ["application_test", "job_test"], required: true },

    // Scoring criteria
    cut_off_points: {
      suitable: {
        min: { type: Number, default: null },
        max: { type: Number, default: null },
      },
      probable: {
        min: { type: Number, default: null },
        max: { type: Number, default: null },
      },
      not_suitable: {
        min: { type: Number, default: null },
        max: { type: Number, default: null },
      },
    },

    // invitation letter
    invitation_letter: { type: String, default: "" },
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
    if ((question.question_type === "multiple_choice" || question.question_type === "yes/no") && (!question.options || question.options.length < 2)) {
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
