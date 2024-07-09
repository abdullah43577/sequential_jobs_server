import { NextFunction, Request, Response } from 'express';
import 'dotenv/config';
const { ACCESS_TOKEN_SECRET } = process.env;
import jwt, { Secret } from 'jsonwebtoken';

export interface IUserRequest extends Request {
  userId?: any;
  refreshToken?: any;
}

export const validateAccessToken = function (req: IUserRequest, res: Response, next: NextFunction) {
  let token = req.headers['authorization']?.split(' ')[1];

  // If token is not found in headers, try to find it in cookies
  if (!token && req.cookies) {
    token = req.cookies['nexiaJWT'];
  }

  if (!token) return res.status(401).json({ message: 'Access Denied, No token provided!' });

  try {
    const userID = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret);
    req.userId = userID;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized Access!' });
  }
};

export const validateRefreshToken = function (req: IUserRequest, res: Response, next: NextFunction) {
  let { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ message: 'Access Denied, Refresh token not provided!' });

  try {
    const userID = jwt.verify(refreshToken, ACCESS_TOKEN_SECRET as Secret);
    req.userId = userID;
    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized Access!' });
  }
};
