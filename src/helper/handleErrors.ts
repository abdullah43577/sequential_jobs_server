import { ZodError } from "zod";
import { Response } from "express";
import jwt from "jsonwebtoken";
import { Error as MongooseError } from "mongoose";
import { MongoError } from "mongodb";
import multer from "multer";

interface IHandleErrors {
  res: Response;
  error: any;
}

export const handleErrors = function ({ res, error }: IHandleErrors) {
  // JWT Errors
  if (error instanceof jwt.JsonWebTokenError) {
    return res.status(401).json({ message: "Invalid token!" });
  }
  if (error instanceof jwt.TokenExpiredError) {
    return res.status(401).json({ message: "Token has expired!" });
  }

  // Zod Validation Error (Refined)
  if (error instanceof ZodError) {
    const errors = error.errors.map(err => ({
      field: err.path.join("."), // Converts ['user', 'email'] to 'user.email'
      message: err.message,
    }));
    return res.status(400).json({ message: "Validation error", errors });
  }

  // Mongoose Validation Error
  if (error instanceof MongooseError.ValidationError) {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
    }));
    return res.status(400).json({ message: "Validation error", errors });
  }

  // Mongoose Cast Error (invalid ObjectId, etc)
  if (error instanceof MongooseError.CastError) {
    return res.status(400).json({
      message: "Invalid data format",
      error: {
        field: error.path,
        value: error.value,
        type: error.kind,
      },
    });
  }

  // MongoDB Duplicate Key Error
  if (error instanceof MongoError && error.code === 11000) {
    const duplicatedField = error.message.match(/index: (\w+)_\d+/)?.[1] || "unknown_field";
    return res.status(409).json({
      message: "Duplicate entry",
      error: {
        field: duplicatedField,
        message: `${duplicatedField} already exists`,
      },
    });
  }

  if (error instanceof multer.MulterError) {
    return res.status(500).json({ message: error.message, error: "Multer Error" });
  }

  // Generic/Unknown Error
  console.error("Unhandled error:", error);
  return res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? error : error, //* undefined
  });
};
