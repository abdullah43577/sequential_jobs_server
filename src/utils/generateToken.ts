import "dotenv/config";
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;
import jwt, { Secret } from "jsonwebtoken";

type Payload = {
  id: string;
  role: string;
};

export const generateAccessToken = (dataObj: Payload) => {
  return jwt.sign(dataObj, ACCESS_TOKEN_SECRET as Secret, { expiresIn: "30m" });
};

export const generateRefreshToken = (dataObj: Payload) => {
  return jwt.sign(dataObj, REFRESH_TOKEN_SECRET as Secret, { expiresIn: "7d" });
};
