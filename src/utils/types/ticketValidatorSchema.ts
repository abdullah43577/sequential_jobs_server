import z, { string } from "zod";

export const createTicketSchema = z.object({
  type: z.enum(["Bug Report", "Feature Request", "General Inquiry", "Complaint"], {
    message: "type is required",
  }),
  title: string({ message: "description is required" }),
  description: string({ message: "description is required" }),
});

export const updateTicketSchema = z.object({
  status: z.enum(["Open", "In Progress", "Resolved", "Closed"], { message: "Status is required" }),
  message: z.string({ message: "message is required" }),
});
