import { NextFunction, Response } from "express";
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } = process.env;
import jwt, { Secret } from "jsonwebtoken";
import { CustomJwtPayload, IUserRequest } from "../interface";
import { handleErrors } from "../utils/handleErrors";

const validateAccessToken = function (req: IUserRequest, res: Response, next: NextFunction) {
  let token = req.headers["authorization"]?.split(" ")[1];

  // If token is not found in headers, try to find it in cookies
  if (!token && req.cookies) {
    token = req.cookies["accessToken"];
  }

  if (!token) return res.status(401).json({ message: "Access Denied, No token provided!" });

  try {
    const { id, role } = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret) as CustomJwtPayload;
    req.userId = id;
    req.role = role;
    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateRefreshToken = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    let refreshToken = req.body.refreshToken;

    // if refreshToken is not sent in the body
    if (!refreshToken) {
      refreshToken = req.cookies["refreshToken"];
    }

    if (!refreshToken) return res.status(401).json({ message: "Access Denied, Refresh token not provided!" });

    const { id, role } = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET as Secret) as CustomJwtPayload;
    req.userId = id;
    req.role = role;
    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateSeekerSession = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req;
    if (role !== "company") return res.status(401).json({ message: "Unauthorized" });

    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateCompanySession = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req;
    if (role !== "company") return res.status(401).json({ message: "Unauthorized" });

    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { validateAccessToken, validateRefreshToken };
