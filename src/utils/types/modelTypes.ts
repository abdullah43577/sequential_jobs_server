import { Types } from "mongoose";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";

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
  isTemporary: boolean;
  expiresAt: Date;
  has_validated_email: boolean;
  resume: string;
}

export interface INotification {
  recipient: Types.ObjectId;
  type: NotificationType;
  message: string;
  title?: string;
  status: NotificationStatus;
  sender?: Types.ObjectId;
  relatedResource?: {
    resourceType?: string;
    resourceId?: Types.ObjectId;
  };
  isSystemGenerated?: boolean;
  metadata?: Record<string, any>;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
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
  currency_type: "NGN" | "USD" | "EUR" | "CFA" | "GBP" | "AUD" | "CAD";
  years_of_exp: number;
  payment_frequency: "yearly" | "monthly" | "weekly";
  generic_skills: string[];
  technical_skills: string[];
  description: string;
  applicants: { applicant: Types.ObjectId; date_of_application?: Date }[];
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
    _id: string;
    question_type: "multiple_choice" | "yes/no" | "text";
    options: string[];
    score: number;
    correct_answer: string;
  }[];
  type: "application_test" | "job_test";
  cut_off_points: {
    suitable: { min: number; max: number };
    probable: { min: number; max: number };
    not_suitable: { min: number; max: number };
  };
}

export interface IJobTest {
  job: Types.ObjectId;
  employer: Types.ObjectId;
  job_test: Types.ObjectId;
  stage: "set_test" | "set_cutoff" | "invitation_upload" | "candidate_invite";
  invitation_letter: string;
  candidates_invited: Types.ObjectId[];
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
    available_date_time: {};
  }[];
  scheduled_date_time: {};
  panelists: string[];
  invitation_letter: string;
  candidates: Types.ObjectId[];
  // stage: "set_rating_scale" | "set_interview" | "panelist_invite" | "panelist_letter_invitation" | "panelist_invite_confirmation" | "applicants_invite";
}

export interface ICalendar {
  user: Types.ObjectId;
  job: Types.ObjectId;
  employer: Types.ObjectId;
  type: "test" | "interview";
  job_test?: Types.ObjectId;
  interview?: Types.ObjectId;
  status: "pending" | "accepted" | "rejected" | "completed" | "expired";
  expiresAt: Date;
  scheduled_date_time: Date;
}

export interface ITestSubmission {
  test: Types.ObjectId;
  job: Types.ObjectId;
  applicant: Types.ObjectId;
  employer: Types.ObjectId;
  answers: { question_id: Types.ObjectId; selected_answer: string; is_correct: boolean }[];
  score: number;
  status: "suitable" | "not_suitable" | "probable";
}

export interface IDocumentation {
  job: Types.ObjectId;
  invitation_letter: string;
  contract_agreement_file: string;
  documents: { [key: string]: string };
}
