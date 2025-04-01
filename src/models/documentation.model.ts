import { model, Schema } from "mongoose";
import { IDocumentation } from "../utils/types/modelTypes";

const documentationSchema = new Schema<IDocumentation>({
  job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  invitation_letter: { type: String, default: "" },
  contact_agreement_file: { type: String, default: null },
});

const Documentation = model<IDocumentation>("Documentation", documentationSchema);

export default Documentation;
