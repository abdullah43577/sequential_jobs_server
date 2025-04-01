import { Schema, model } from "mongoose";
import { ICalendar } from "../../utils/types/modelTypes";

const CalendarSchema = new Schema<ICalendar>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true }, //* candidate ID
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["test", "interview"],
      required: true,
    },

    job_test: { type: Schema.Types.ObjectId, ref: "Test", default: null },
    interview: { type: Schema.Types.ObjectId, ref: "InterviewMgmt", default: null },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "completed", "expired"],
      default: "pending",
    },

    expiresAt: { type: Date, default: null },

    scheduled_date_time: { type: Date, default: null },
  },
  { timestamps: true }
);

const Calendar = model<ICalendar>("Calendar", CalendarSchema);

export default Calendar;
