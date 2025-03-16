import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface IUserRequest extends Request {
  userId?: string;
  refreshToken?: string;
  role?: "job-seeker" | "company" | "panelist" | "medical-expert" | "admin" | "super-admin";
}

export interface CustomJwtPayload extends JwtPayload {
  role: "job-seeker" | "company" | "panelist" | "medical-expert" | "admin" | "super-admin";
  id: string;
}
