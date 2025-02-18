import { ZodError } from "zod";
import { Response } from "express";
import jwt from "jsonwebtoken";

interface IHandleErrors {
  res: Response;
  error: any;
}

export const handleErrors = function ({ res, error }: IHandleErrors) {
  if (error instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ message: "Invalid refresh token!", error });
  } else if (error instanceof jwt.TokenExpiredError) {
    res.status(401).json({ message: "Token has expired!", error });
  } else if (error instanceof ZodError) {
    res.status(400).json({ message: "Validation error", error: error.errors });
  } else if (error.responseCode === 535) {
    res.status(535).json({ message: "Nodemailer credentials invalid!", error });
  } else {
    res.status(500).json({ message: "Internal Server Error", error });
  }
};
