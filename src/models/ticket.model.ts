import { model, Schema } from "mongoose";
import { ITicket } from "../utils/types/modelTypes";
import { v4 as uuidv4 } from "uuid";

const TYPE = ["Bug Report", "Feature Request", "General Inquiry", "Complaint"];
const STATUS = ["Open", "In Progress", "Resolved", "Closed"];

const ticketSchema = new Schema<ITicket>(
  {
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ticketId: { type: String, default: uuidv4 },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: TYPE,
      required: true,
    },
    status: {
      type: String,
      enum: STATUS,
      default: "Open",
    },
    attachments: [{ type: String }],
    comments: [
      {
        sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Ticket = model<ITicket>("Ticket", ticketSchema);

export default Ticket;
