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
  subscription_tier: "Sequential Freemium" | "Sequential Standard" | "Sequential Pro" | "Sequential Super Pro";
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

export interface IJob {
  employer: Types.ObjectId;
  job_title: string;
  country: string;
  state: string;
  city: string;
  job_type: "hybrid" | "on_site" | "remote";
  employment_type: "full_time" | "part_time" | "contract";
  salary: number;
  currency_type: string;
  years_of_exp: number;
  generic_skills: string[];
  technical_skills: string[];
  description: string;
  applicants: Types.ObjectId[];
  is_live: boolean;
  application_test: Types.ObjectId;
  cut_off_points: {
    suitable: { min: string; max: string };
    probable: { min: string; max: string };
    not_suitable: { min: string; max: string };
  };
  stage: "job_post_creation" | "set_cv_sorting_question" | "set_cut_off_points";
}

export interface ITest {
  job: Types.ObjectId;
  employer: Types.ObjectId;
  instruction: string;
  questions: {
    question_type: "multiple_choice" | "yes/no" | "text";
    options: string[];
    score: number;
    correct_answer: string;
  }[];
}

export interface IJobTest {
  job: Types.ObjectId;
  employer: Types.ObjectId;
  job_test: Types.ObjectId;
  cut_off_points: {
    suitable: { min: number; max: number };
    probable: { min: number; max: number };
    not_suitable: { min: number; max: number };
  };
  invitation: string;
}

export interface IInterview {
  job: Types.ObjectId;
  employer: Types.ObjectId;
  rating_scale: {
    [key: string]: string;
  };
  interview_time_slot: {
    date: Date;
    start_time: string | null;
    end_time: string | null;
    break_time: string;
    interview_duration: string;
    medical_duration: string;
  };
  panelists: string[];
  invitation_letter: string;
}
