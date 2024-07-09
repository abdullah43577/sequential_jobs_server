import 'dotenv/config';
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;
import jwt, { Secret } from 'jsonwebtoken';

export const generateAccessToken = (id: string) => {
  return jwt.sign(id, ACCESS_TOKEN_SECRET as Secret, { expiresIn: '30m' });
};

export const generateRefreshToken = (id: string) => {
  return jwt.sign(id, REFRESH_TOKEN_SECRET as Secret, { expiresIn: '7d' });
};
