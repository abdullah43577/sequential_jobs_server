import z from "zod";

export const ApplicationTestSubmissionSchema = z.object({
  application_test_id: z.string(),
  job_id: z.string(),
  answers: z.array(
    z.object({
      question_id: z.string(),
      selected_answer: z.string(),
    })
  ),
});
