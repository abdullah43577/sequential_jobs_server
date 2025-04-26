import z from "zod";

// ? Zod schemas for user registration
const passwordValidationRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export const registerValidationSchema = z
  .object({
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters long").regex(passwordValidationRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
    role: z.enum(["job-seeker", "company", "panelist", "medical-expert", "admin", "super-admin"]),
    phone_no: z.string().optional(),
    official_phone: z.string().optional(),
    organisation_name: z.string().optional(),
    industry: z.string().optional(),
    street_1: z.string().optional(),
    street_2: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "job-seeker") {
      if (!data.phone_no) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Phone Number is required for Job Seeker Accounts",
          path: ["phone_no"],
        });
      }
    }

    if (data.role === "company") {
      if (!data.official_phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Official Phone Number is required for Company Accounts",
          path: ["official_phone"],
        });
      }
      if (!data.organisation_name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Organisation Name is required for Company Accounts",
          path: ["organisation_name"],
        });
      }
      if (!data.industry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Industry is required for Company Accounts",
          path: ["industry"],
        });
      }
      if (!data.street_1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Street 1 is required for Company Accounts",
          path: ["street_1"],
        });
      }
      if (!data.country) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Country is required for Company Accounts",
          path: ["country"],
        });
      }
      if (!data.state) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "State is required for Company Accounts",
          path: ["state"],
        });
      }
      if (!data.city) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "City is required for Company Accounts",
          path: ["city"],
        });
      }
      if (!data.postal_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Postal Code is required for Company Accounts",
          path: ["postal_code"],
        });
      }
    }
  });

export const loginValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const updateProfileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email(),
  phone_no: z.string().optional(),
  official_phone: z.string(),
  organisation_name: z.string(),
  organisation_size: z.number(),
  industry: z.string().optional(),
  street_1: z.string().optional(),
  street_2: z.string().optional(),
  bio: z.string().optional(),
});
