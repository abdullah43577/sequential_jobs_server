import z from "zod";

// ? Zod schemas for user registration
const passwordValidationRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

export const registerValidationSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long").regex(passwordValidationRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
  role: z.enum(["job-seeker", "company", "panelist", "medical-expert", "admin", "super-admin"]),
  phone_no: z.number().nullable(),
  official_phone: z.number().nullable(),
  organisation_name: z.string().nullable(),
  industry: z.string().nullable(),
  street_1: z.string().nullable(),
  street_2: z.string().nullable(),
  country: z.string().nullable(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  postal_code: z.string().nullable(),
  googleId: z.string().nullable(),
  failedLoginAttempts: z.number().default(0),
  isLocked: z.boolean().default(false),
  lastLogin: z.date().default(new Date()),
});

// Then, add conditional validations
const UserZodSchema = registerValidationSchema.superRefine((data, ctx) => {
  // For job-seekers, phone_no must be provided
  if (data.role === "job-seeker" && (data.phone_no === null || data.phone_no === undefined)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phone Number is required for Job Seeker Accounts",
      path: ["phone_no"],
    });
  }

  // For companies, several fields are required
  if (data.role === "company") {
    if (data.official_phone === null || data.official_phone === undefined) {
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
  password: z.string().min(8, "Password must be at least 8 characters long").regex(passwordValidationRegex, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),
});
