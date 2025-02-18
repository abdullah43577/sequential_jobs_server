import { Types } from "mongoose";

export interface IUser {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  role: "job-seeker" | "company" | "panelist" | "medical-expert" | "admin" | "super-admin";
  phone_no: number;
  official_phone: number;
  organisation_name: string;
  industry: string;
  street_1: string;
  street_2: string;
  country: string;
  state: string;
  city: string;
  postal_code: string;
  subscription_tier: "Sequential Standard" | "Sequential Pro" | "Sequential Super Pro";
  googleId: string;
  linkedinId: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lastLogin: Date;
}

export interface INotification {
  user: Types.ObjectId;
  type: "info" | "warning" | "important";
  message: string;
  isRead: boolean;
}
