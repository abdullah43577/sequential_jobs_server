import z from "zod";

export const ApplicationTestSubmissionSchema = z.object({
  application_test_id: z.string({ message: "Application test ID is required" }),
  job_id: z.string({ message: "job id is required" }),
  answers: z.array(
    z.object({
      question_id: z.string(),
      selected_answer: z.string(),
    })
  ),
});
