import 'dotenv/config';
const { ACCESS_TOKEN_SECRET } = process.env;
import jwt, { Secret } from 'jsonwebtoken';

export const generatetoken = (id: string) => {
  return jwt.sign({ id }, ACCESS_TOKEN_SECRET as Secret, { expiresIn: '1h' });
};
