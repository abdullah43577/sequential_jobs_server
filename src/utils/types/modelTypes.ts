import { Types } from "mongoose";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";

export interface IUser {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  bio: string;
  role: "job-seeker" | "company" | "panelist" | "medical-expert" | "admin" | "super-admin";
  phone_no: number;
  profile_pic: string | null;
  official_phone: number;
  organisation_name: string;
  organisation_size: number;
  industry: string;
  street_1: string;
  street_2: string;
  country: string;
  state: string;
  city: string;
  postal_code: string;
  job_preferences?: {
    categories: string[];
    experience_level: string;
    preferred_skills: string[];
  };
  stripe_customer_id: string | null;
  subscription_tier: "Sequential Freemium" | "Sequential Standard" | "Sequential Pro" | "Sequential Super Pro";
  subscription_status: "pending" | "payment_successful" | "unpaid" | "payment_failed" | "trial";
  subscription_start: Date;
  subscription_end: Date;
  is_trial: boolean;
  googleId: string;
  linkedinId: string;
  failedLoginAttempts: number;
  isLocked: boolean;
  lastLogin: Date;
  isTemporary: boolean;
  expiresAt: Date;
  has_validated_email: boolean;
  resume: string | null;
  resumeId: string | null;
  account_status: "active" | "deactivated";
  grace_period: string;
}

export interface INotification {
  recipient: Types.ObjectId;
  type: NotificationType;
  message: string;
  title?: string;
  status: NotificationStatus;
  sender?: Types.ObjectId;
  isSystemGenerated?: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  // redirectUrl?: string;
}

export interface IJob {
  employer: Types.ObjectId;
  job_title: string;
  job_category: string;
  required_experience_level: string;
  country: string;
  state: string;
  city: string;
  job_type: "hybrid" | "on_site" | "remote";
  employment_type: "full_time" | "part_time" | "contract";
  salary: number;
  currency_type: "NGN" | "USD" | "EUR" | "CFA" | "GBP" | "AUD" | "CAD";
  payment_frequency: "yearly" | "monthly" | "weekly";
  generic_skills: string[];
  technical_skills: string[];
  description: string;
  applicants: {
    applicant: Types.ObjectId;
    date_of_application?: Date;
    status: "applied" | "shortlisted" | "interview_invite_sent" | "interview_scheduled" | "interview_completed" | "has_offer" | "hired" | "documents_reupload_requested" | "rejected" | "medical_invite_sent" | "medical_scheduled" | "medical_completed";
  }[];
  is_live: boolean;
  status: "archived" | "flagged" | "active";
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
  rating_scale: Map<string, string>;
  interview_time_slot: {
    date: Date;
    start_time: string | null;
    end_time: string | null;
    break_time: string;
    interview_duration: string;
    available_date_time: {};
  }[];
  meetingLink: string;
  panelists: { email: string; rating_scale: Map<string, number | string>; remark?: string }[];
  invitation_letter: string;
  candidates: { candidate: Types.ObjectId; scheduled_date_time?: { date: Date; start_time: string; end_time: string }; interview_score?: number; status?: "pending" | "confirmed" | "completed" | "canceled"; rating_scale?: Map<string, number> }[];
  stage: "set_rating_scale" | "set_interview" | "panelist_letter_invitation" | "panelist_invite_confirmation" | "applicants_invite";
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
  candidates: { candidate: Types.ObjectId; invitation_letter: string; contract_agreement_file: String; documents: Map<string, string> }[];
}

export interface IMedical {
  job: Types.ObjectId;
  employer: Types.ObjectId;
  medical_time_slot: { date: Date; start_time: string; end_time: string; medical_duration: string; available_date_time: Record<string, any>[] };
  address: string;
  medicalists: string[];
  candidates: { candidate: Types.ObjectId; scheduled_date_time?: Record<string, any>; medical_documents?: Record<string, string>; status?: "pending" | "completed" | "canceled"; remark?: string }[];
}

export interface ITicket {
  createdBy: Types.ObjectId;
  ticketId: string;
  title: string;
  description: string;
  type: "Bug Report" | "Feature Request" | "General Inquiry" | "Complaint";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  attachments: string[]; // URLs or file references
  comments: {
    sender: string | Types.ObjectId;
    message: string;
    createdAt?: Date;
  }[];
  assignedTo?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
