import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../helper/generateToken";
import { CustomJwtPayload, IUserRequest } from "../interface";
import { loginValidationSchema, registerValidationSchema } from "../utils/types/authValidatorSchema";
import User from "../models/users.model";
import { comparePassword, hashPassword } from "../helper/hashPassword";
import { handleErrors } from "../helper/handleErrors";
import { registrationEmail } from "../utils/nodemailer.ts/email-templates/registration-email";
import { transportMail } from "../utils/nodemailer.ts/transportMail";
import jwt, { Secret } from "jsonwebtoken";
const { EMAIL_VERIFICATION_TOKEN } = process.env;

const testApi = async (req: Request, res: Response) => {
  res.status(200).json({ message: "SERVERS ARE LIVE!!!" });
};

const createUser = async (req: Request, res: Response) => {
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

    const verificationToken = jwt.sign({ id: user._id }, EMAIL_VERIFICATION_TOKEN as Secret);

    //* send mail
    const emailTemplateData = {
      title: "Welcome to Sequential Jobs!",
      name: user.first_name,
      message:
        "Thank you for creating an account with Sequential Jobs. We're excited to help you find your next opportunity in the tech industry.\n\nTo get started, please verify your email address by clicking the button below. This helps us ensure the security of your account.",
      btnTxt: "Verify Email Address",
      btnAction: `https://sequential-jobs-server.onrender.com/api/auth/verify-email?token=${verificationToken}`,
    };

    const html = registrationEmail(emailTemplateData);

    await transportMail({ email: user.email, subject: "Welcome to Sequential Jobs - Please Verify Your Email", message: html.html });

    res.status(201).json({ message: "User Account Created Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Invalid token or token not provided" });

    const { id } = jwt.verify(token as string, EMAIL_VERIFICATION_TOKEN as Secret) as CustomJwtPayload;

    const user = await User.findByIdAndUpdate(id, { has_validated_email: true }, { returnDocument: "after" });

    if (!user) return res.status(400).json({ message: "User not found" });

    //* send mail
    const emailTemplateData = {
      title: "Email Verified Successfully!",
      name: user?.first_name,
      message: "Your email has been successfully verified. You can now log in to your account and start exploring.",
      btnTxt: "Login",
      btnAction: "http://localhost:3000/login",
    };

    const html = registrationEmail(emailTemplateData);

    await transportMail({ email: user.email, subject: "Welcome to Sequential Jobs", message: html.html });

    res.status(200).json({ message: "Email activated successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginValidationSchema.parse(req.body);

    //* check if user in records
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Invalid email or password" });

    //* if user is verified
    if (!user.has_validated_email) return res.status(400).json({ message: "Please validate your email address" });

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

    res.status(200).json({ message: "Login Successful", userRole: user.role, token: { accessToken, refreshToken } });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "'Email', was not provided in the request body" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    //* send email with the OTP for resetting password
    const resetToken = jwt.sign({ id: user._id }, EMAIL_VERIFICATION_TOKEN as Secret, { expiresIn: "10m" });

    const emailTemplateData = {
      title: "Reset Your Password",
      name: user.first_name,
      message: "We received a request to reset your password for your Sequential Jobs account. Click the button below to set a new password. \n\n Reset token expires in 10 minutes \n\n If you didn’t request this, you can safely ignore this email.",
      btnTxt: "Reset Password",
      btnAction: `http://localhost:3000/auth/reset-password?token=${resetToken}`,
    };

    const html = registrationEmail(emailTemplateData);

    await transportMail({ email: user.email, subject: "Reset Your Password", message: html.html });

    res.status(200).json({ message: "Reset Link sent to provided email address" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    const { password } = req.body;

    if (!token || !password) return res.status(400).json({ message: "Token or password invalid!" });

    const { id } = jwt.verify(token as string, EMAIL_VERIFICATION_TOKEN as Secret) as CustomJwtPayload;

    const hashedPassword = await hashPassword(password);
    const user = await User.findByIdAndUpdate(id, { password: hashedPassword }, { returnDocument: "after" });

    if (!user) return res.status(404).json({ message: "User not found!" });

    //* send mail
    const emailTemplateData = {
      title: "Your Password Has Been Reset",
      name: user.first_name,
      message:
        "Your password for your Sequential Jobs account has been successfully reset. If you made this change, you can safely ignore this message.\n\nIf you did not request this change, please contact our support team immediately at support@sequentialjobs.com.",
      btnTxt: "Contact Support",
      btnAction: "mailto:support@sequentialjobs.com",
    };

    const html = registrationEmail(emailTemplateData);

    await transportMail({ email: user.email, subject: "Your Password Has Been Reset", message: html.html });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const generateNewToken = async (req: IUserRequest, res: Response) => {
  try {
    const { userId, role } = req;

    const accessToken = generateAccessToken({ id: userId as string, role: role as string });

    res.status(200).json({ message: "Access token generated successfully!", token: { accessToken } });
  } catch (error) {
    res.status(500).json({ message: "Internal Server error", error });
  }
};

export { testApi, createUser, validateEmail, loginUser, forgotPassword, resetPassword, generateNewToken };
