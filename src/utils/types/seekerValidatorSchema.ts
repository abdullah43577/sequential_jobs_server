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

export const UploadResumeSchema = z.object({
  profile_picture: z.string(),
  personal_statement: z.string(),

  user: z.object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    phone: z.string(),
    country: z.string(),
    state: z.string(),
    city: z.string(),
    address: z.string(),
  }),

  education: z
    .array(
      z.object({
        school: z.string(),
        start_year: z.string(),
        end_year: z.string(),
        course_of_study: z.string(),
        degree_type: z.string(),
      })
    )
    .min(1),

  experience: z
    .array(
      z.object({
        company: z.string(),
        start_year: z.string(),
        end_year: z.string(),
        role: z.string(),
        responsibilities: z.string(),
      })
    )
    .min(1),

  certification: z
    .array(
      z.object({
        certification: z.string(),
        year_of_issuance: z.string(),
        issuer: z.string(),
      })
    )
    .min(1),

  references: z
    .array(
      z.object({
        full_name: z.string(),
        relationship: z.string(),
        email: z.string(),
        phone: z.string(),
      })
    )
    .min(1),

  skills: z.array(z.string()).min(5),
  socials: z.object({
    linkedin: z.string(),
    twitter: z.string(),
    github: z.string().optional(),
  }),
});
