import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../helper/generateToken";
import { CustomJwtPayload, IUserRequest } from "../interface";
import { loginValidationSchema, registerValidationSchema, updateJobPreferencesSchema, updateProfileSchema } from "../utils/types/authValidatorSchema";
import User from "../models/users.model";
import { comparePassword, hashPassword } from "../helper/hashPassword";
import { handleErrors } from "../helper/handleErrors";
import jwt, { Secret } from "jsonwebtoken";
import { getBaseUrl } from "../helper/getBaseUrl";
import { Readable } from "stream";
import cloudinary from "../utils/cloudinaryConfig";
import { cleanObject } from "../utils/cleanedObject";
import { sendWelcomeEmail } from "../utils/services/emails/welcomeEmailService";
import { sendEmailVerificationSuccessEmail } from "../utils/services/emails/emailVerificationService";
import { sendForgotPasswordEmail } from "../utils/services/emails/forgotPasswordEmailService";
import { sendResetPasswordEmail } from "../utils/services/emails/resetPasswordEmailService";
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

    // Set up trial subscription
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days from now

    //* create user account
    const user = new User({
      ...data,
      password: hashedPassword,
      subscription_tier: "Sequential Super Pro", // Highest plan
      subscription_status: "trial",
      subscription_start: new Date(),
      subscription_end: trialEndDate,
      is_trial: true,
    });
    await user.save();

    const verificationToken = jwt.sign({ id: user._id }, EMAIL_VERIFICATION_TOKEN as Secret);

    //* send welcome email
    await sendWelcomeEmail({
      email: user.email,
      firstName: user.first_name,
      verificationToken,
      subscriptionPlan: "Sequential Super Pro",
      trialDays: 30,
    });

    res.status(201).json({ message: "User Account Created Successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateJobPreferences = async (req: IUserRequest, res: Response) => {
  try {
    const { userId } = req;
    const { job_preferences } = updateJobPreferencesSchema.parse(req.body);

    console.log(job_preferences);

    const user = await User.findByIdAndUpdate(userId, { job_preferences });
    res.status(200).json({ message: "Profile Updated Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Invalid token or token not provided" });

    const { id } = jwt.verify(token as string, EMAIL_VERIFICATION_TOKEN as Secret) as CustomJwtPayload;

    const user = await User.findOneAndUpdate({ _id: id, has_validated_email: { $ne: true } }, { has_validated_email: true }, { returnDocument: "after" });

    if (!user) {
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return res.status(400).json({ message: "User not found" });
      }

      // User exists but is already verified - redirect without sending email
      return res.redirect(`https://sequentialjobs.com/auth/email-activation-success?name=${encodeURIComponent(existingUser.first_name)}`);
    }

    const baseUrl = getBaseUrl(req);

    // Send welcome email only for newly verified users using the service
    await sendEmailVerificationSuccessEmail({
      email: user.email,
      firstName: user.first_name,
      baseUrl,
    });

    res.redirect(`https://sequentialjobs.com/auth/email-activation-success?name=${encodeURIComponent(user.first_name)}`);
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

    if (user.account_status === "deactivated") return res.status(403).json({ message: "Account is disabled, please contact the administrator!" });

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

    const hasSubmittedResume = !!user.resume;

    res.status(200).json({ message: "Login Successful", has_submitted_resume: hasSubmittedResume, userRole: user.role, token: { accessToken, refreshToken } });
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

    const baseUrl = getBaseUrl(req);

    await sendForgotPasswordEmail({ email: user.email, first_name: user.first_name, baseUrl, resetToken });

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
    await sendResetPasswordEmail({ email: user.email, first_name: user.first_name });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const validateOAuthSession = async (req: IUserRequest, res: Response) => {
  try {
    const { userId } = req;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    const accessToken = generateAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), role: user.role });

    const hasSubmittedResume = !!user.resume;

    res.status(200).json({ message: "Login Successful", has_submitted_resume: hasSubmittedResume, userRole: user.role, token: { accessToken, refreshToken } });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getProfile = async (req: IUserRequest, res: Response) => {
  try {
    const { userId } = req;
    const user = await User.findById(userId)
      .select("first_name last_name username email role phone_no official_phone organisation_name organisation_size industry street_1 street_2 country state postal_code subscription_tier bio profile_pic resume")
      .lean();
    if (!user) return res.status(404).json({ message: "User record not found!" });

    res.status(200).json(user);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateProfile = async (req: IUserRequest, res: Response) => {
  try {
    const { userId } = req;
    const profilePic = req.file;

    const profileBody = updateProfileSchema.parse(req.body);

    const cleanedObject = cleanObject(profileBody);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    if (profilePic) {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `users/${user.role}/${userId}/profile`,
          resource_type: "image",
        },
        async (error, result) => {
          if (error) {
            console.log(error, "error");
            return res.status(500).json({ message: "Cloudinary upload failed" });
          }

          if (result?.secure_url) {
            user.profile_pic = result.secure_url;
            Object.assign(user, cleanedObject);
            await user.save();

            return res.status(200).json({ message: "Profile updated successfully", user });
          }
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(profilePic.buffer);
      bufferStream.push(null);
      bufferStream.pipe(stream);
    } else {
      Object.assign(user, profileBody);
      await user.save();
      res.status(200).json({ message: "Profile updated successfully", user });
    }
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

export { testApi, createUser, updateJobPreferences, validateEmail, loginUser, forgotPassword, resetPassword, validateOAuthSession, generateNewToken, getProfile, updateProfile };
