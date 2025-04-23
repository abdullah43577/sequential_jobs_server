import { Request } from "express";

export const getBaseUrl = (req: Request): string => {
  return `${req.protocol}://${req.get("host")}`;
};
