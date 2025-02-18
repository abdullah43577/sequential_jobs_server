import { Request, Response } from "express";
import RefreshToken from "../models/tokens.model";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import { IUserRequest } from "../interface";
import { loginValidationSchema, registerValidationSchema } from "../utils/types/authValidatorSchema";
import User from "../models/users.model";
import { comparePassword, hashPassword } from "../utils/hashPassword";
import { handleErrors } from "../utils/handleErrors";

const testApi = async (req: Request, res: Response) => {
  res.status(200).json({ message: "SERVERS ARE LIVE!!!" });
};

const registerSeeker = async (req: Request, res: Response) => {
  try {
    const data = registerValidationSchema.parse(req.body);

    //* check if user exists
    const userExists = await User.findOne({ email: data.email });
    if (userExists) return res.status(400).json({ message: "User already exists, proceed to login" });

    //* hash password
    const hashedPassword = await hashPassword(data.password);

    //* create user account
    const user = new User({ ...data, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User Accounted Created Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const loginUser = async (req: IUserRequest, res: Response) => {
  try {
    const { email, password } = loginValidationSchema.parse(req.body);

    //* check if user in records
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Invalid email or password" });

    //* if user account is locked
    if (user.isLocked) return res.status(403).json({ message: "Account is locked due to multiple failed attempts, please contact the administrator" });

    //* validate password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) user.isLocked = true;

      await user.save();
      return res.status(401).json({ message: "Invalid email or password" });
    }

    //* Reset login attempts
    user.failedLoginAttempts = 0;
    await user.save();

    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), role: user.role });

    //* store refreshToken in DB
    const newRefreshToken = new RefreshToken({ token: refreshToken, user: user._id });
    await newRefreshToken.save();

    res.status(200).json({ message: "Login Successful", userRole: user.role, token: { accessToken, refreshToken } });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const generateNewToken = async (req: IUserRequest, res: Response) => {
  try {
    const { refreshToken, userId, role } = req;

    const refreshTokens = await RefreshToken.findOne({ token: refreshToken });

    if (!refreshTokens || refreshToken !== refreshTokens.token || userId !== refreshTokens.user.toString()) return res.status(401).json({ message: "unauthorized" });

    const accessToken = generateAccessToken({ id: userId, role: role as string });

    res.status(200).json({ message: "Access token generated successfully!", accessToken });
  } catch (error) {
    res.status(500).json({ message: "Internal Server error", error });
  }
};

const logout = async (req: IUserRequest, res: Response) => {
  try {
    const { userId, role } = req;

    await RefreshToken.findOneAndDelete({ user: userId });

    res.sendStatus(204);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { testApi, registerSeeker, loginUser, generateNewToken, logout };
