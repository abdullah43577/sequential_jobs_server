import { model, Schema } from "mongoose";
import { IDocumentation } from "../utils/types/modelTypes";

const documentationSchema = new Schema<IDocumentation>({
  job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  invitation_letter: { type: String, required: true },
  contract_agreement_file: { type: String, default: null },
  documents: { type: Map, of: String, default: {} },
});

const Documentation = model<IDocumentation>("Documentation", documentationSchema);

export default Documentation;
