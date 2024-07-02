import { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
const { ACCESS_TOKEN_SECRET } = process.env;
import jwt, { Secret } from 'jsonwebtoken';

interface IUserRequest extends Request {
  user?: any;
}

export const validateToken = function (req: IUserRequest, res: Response, next: NextFunction) {
  let token = req.headers['authorization']?.split(' ')[1];

  // If token is not found in headers, try to find it in cookies
  if (!token && req.cookies) {
    token = req.cookies['nexiaJWT'];
  }

  if (!token) return res.status(401).json({ message: 'Access Denied, No token provided!' });

  try {
    const userID = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret);
    req.user = userID;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized Access!' });
  }
};
