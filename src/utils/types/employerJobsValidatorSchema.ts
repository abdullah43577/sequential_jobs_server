import z from "zod";

export const JobPostCreationSchema = z.object({
  job_id: z.string().optional(),
  job_title: z.string(),
  country: z.string(),
  state: z.string(),
  city: z.string(),
  job_type: z.enum(["hybrid", "on_site", "remote"]),
  employment_type: z.enum(["full_time", "part_time", "contract"]),
  salary: z.string(),
  currency_type: z.string(),
  years_of_exp: z.string(),
  generic_skills: z.array(z.string()),
  technical_skills: z.array(z.string()),
  description: z.string(),
  stage: z.string(),
});

// Define the schema for questions
const questionSchema = z.object({
  question: z.string().trim().min(1, "Question is required"),
  options: z.array(z.string()).default([]),
  question_type: z.enum(["multiple_choice", "yes/no", "text"]),
  score: z.number().min(1, "Score must be a positive number"),
  correct_answer: z.string().nullable().optional(),
});

// Define the main test schema
export const testSchema = z.object({
  job_id: z.string(),
  instruction: z.string().trim().min(1, "Instruction is required"),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
});

export const cutOffSchema = z.object({
  cut_off_points: z.object({
    suitable: z.object({ min: z.number(), max: z.number() }),
    probable: z.object({ min: z.number(), max: z.number() }),
    not_suitable: z.object({ min: z.number(), max: z.number() }),
  }),
  test_id: z.string(),
});
