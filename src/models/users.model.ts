import { Schema, model } from "mongoose";
import { IUser } from "../utils/types/modelTypes";
import { roleBasedValidation } from "../helper/roleBasedValidation";

const userSchema = new Schema<IUser>(
  {
    first_name: {
      type: String,
      required: function (this) {
        return this.role !== "panelist";
      },
      default: null,
    },
    last_name: {
      type: String,
      required: function (this) {
        return this.role !== "panelist";
      },
      default: null,
    },
    username: { type: String, validate: roleBasedValidation("company", "Username") },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    role: { type: String, enum: ["job-seeker", "company", "panelist", "medical-expert", "admin", "super-admin"], required: true },
    resume: { type: String, default: null },

    phone_no: {
      type: Number,
      default: null,
      validate: roleBasedValidation("job-seeker", "Phone Number"),
    },

    official_phone: {
      type: Number,
      validate: roleBasedValidation("company", "Official Phone Number"),
    },

    organisation_name: {
      type: String,
      validate: roleBasedValidation("company", "Organisation Name"),
    },

    industry: {
      type: String,
      validate: roleBasedValidation("company", "Industry"),
    },

    street_1: {
      type: String,
      validate: roleBasedValidation("company", "Street 1"),
    },

    street_2: { type: String, validate: roleBasedValidation("company", "Street 2") },

    country: {
      type: String,
      validate: roleBasedValidation("company", "Country"),
    },

    state: {
      type: String,
      validate: roleBasedValidation("company", "State"),
    },

    city: {
      type: String,
      validate: roleBasedValidation("company", "City"),
    },

    postal_code: {
      type: String,
      validate: roleBasedValidation("company", "Postal Code"),
    },

    has_validated_email: {
      type: Boolean,
      default: false,
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
    isTemporary: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = model<IUser>("User", userSchema);

export default User;
