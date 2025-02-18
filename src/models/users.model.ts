import { Schema, model } from "mongoose";
import { IUser } from "../utils/types/modelTypes";
import { roleBasedValidation } from "../utils/roleBasedValidation";

const userSchema = new Schema<IUser>(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    username: { type: String, default: null },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    role: { type: String, enum: ["job-seeker", "company", "panelist", "medical-expert", "admin", "super-admin"], required: true },

    phone_no: {
      type: Number,
      default: null,
      validate: roleBasedValidation("job-seeker", "Phone Number"),
    },

    official_phone: {
      type: Number,
      default: null,
      validate: roleBasedValidation("company", "Official Phone Number"),
    },

    organisation_name: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "Organisation Name"),
    },

    industry: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "Industry"),
    },

    street_1: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "Street 1"),
    },

    street_2: { type: String, default: null },

    country: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "Country"),
    },

    state: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "State"),
    },

    city: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "City"),
    },

    postal_code: {
      type: String,
      default: null,
      validate: roleBasedValidation("company", "Postal Code"),
    },

    subscription_tier: {
      type: String,
      enum: ["Sequential Freemium", "Sequential Standard", "Sequential Pro", "Sequential Super Pro"],
      default: "Sequential Freemium",
    },

    googleId: { type: String, default: null },
    failedLoginAttempts: { type: Number, default: 0 },
    isLocked: { type: Boolean, default: false },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User = model<IUser>("User", userSchema);

export default User;
