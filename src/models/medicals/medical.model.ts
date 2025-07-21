import { model, Schema } from "mongoose";
import { IMedical } from "../../utils/types/modelTypes";

const medicalSchema = new Schema<IMedical>({
  job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  medical_time_slot: [
    {
      date: { type: Date, required: true },
      start_time: { type: String, required: true },
      end_time: { type: String, required: true },
      medical_duration: { type: String, required: true },
      available_date_time: [{ type: Object, required: true }],
    },
  ],
  address: { type: String, required: true },
  medicalists: [{ type: String, default: [] }],
  candidates: [
    {
      candidate: { type: Schema.Types.ObjectId, ref: "User", required: true },
      scheduled_date_time: {
        type: Object,
        default: {},
      },
      medical_documents: { type: Object, default: {} },
      status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "canceled"],
        default: "pending",
      },
      remark: { type: String, default: "" },
    },
  ],
});

const MedicalMgmt = model<IMedical>("MedicalMgmt", medicalSchema);

export default MedicalMgmt;
