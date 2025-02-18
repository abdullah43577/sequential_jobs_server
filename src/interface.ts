import { Request } from "express";
import { JwtPayload } from "jsonwebtoken";

export interface IUserRequest extends Request {
  userId?: string;
  refreshToken?: string;
  role?: string;
}

export interface CustomJwtPayload extends JwtPayload {
  role: string;
  id: string;
}
