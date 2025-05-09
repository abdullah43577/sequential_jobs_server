import { NextFunction, Request, Response } from "express";
const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, GOOGLE_VERIFICATION_TOKEN } = process.env;
import jwt, { Secret } from "jsonwebtoken";
import { CustomJwtPayload, IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";

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

const validateGoogleVerificationToken = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { tokenId } = req.params;
    if (!tokenId) return res.status(400).json({ message: "Token ID is required" });

    const { id, role } = jwt.verify(tokenId, GOOGLE_VERIFICATION_TOKEN as Secret) as CustomJwtPayload;

    req.userId = id;
    req.role = role;
    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateAdminSession = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req;
    if (role !== "admin" && role !== "super-admin") return res.status(401).json({ message: "Unauthorized!, only an admin is authorized to do this" });

    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateSeekerSession = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req;
    if (role !== "job-seeker") return res.status(401).json({ message: "Unauthorized!, only a job-seeker is authorized to do this" });

    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateCompanySession = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req;
    if (role !== "company") return res.status(401).json({ message: "Unauthorized!, only a company is authorized to do this" });

    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validatePanelistSession = function (req: IUserRequest, res: Response, next: NextFunction) {
  try {
    const { userId, role } = req;
    if (role !== "panelist") return res.status(401).json({ message: "Unquthorized!, only a panelist is authorized to do this!" });

    next();
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { validateAccessToken, validateRefreshToken, validateGoogleVerificationToken, validateAdminSession, validateCompanySession, validateSeekerSession, validatePanelistSession };
