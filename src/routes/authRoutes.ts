import { Router } from "express";
import { generateNewToken, loginUser, createUser, forgotPassword, testApi, validateEmail, resetPassword, getProfile, updateProfile, validateOAuthSession, updateJobPreferences, updatePassword } from "../controllers/auth.controller";
import { validateAccessToken, validateGoogleVerificationToken, validateRefreshToken, validateSeekerSession } from "../middleware/validateToken";
import { upload } from "../utils/multerConfig";
import passport from "passport";
import { IUserRequest } from "../interface";
import { generateGoogleVerificationToken } from "../helper/generateToken";
import { IUser } from "../utils/types/modelTypes";

const authRouter = Router();

authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

//* GOOGLE signup
authRouter.get(
  "/google/job-seeker",
  (req, res, next) => {
    req.query.role = "job-seeker";
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Employer signup
authRouter.get(
  "/google/employer",
  (req, res, next) => {
    req.query.role = "employer";
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

authRouter.get("/google/callback", passport.authenticate("google", { session: false }), async (req: IUserRequest, res) => {
  try {
    const user = req.user as IUser;
    if (!user) return res.status(401).json({ error: "Authentication failed" });

    // Generate JWT token
    const userId = (user as any)._id.toString();

    const google_token = generateGoogleVerificationToken({ id: userId, role: req.role as string });

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/login?token=${google_token}`);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});

authRouter.get("/google/callback/validate-session/:tokenId", validateGoogleVerificationToken, validateOAuthSession);

authRouter.get("/", testApi);
authRouter.post("/create-user", createUser);
authRouter.put("/update_job_preference", validateAccessToken, validateSeekerSession, updateJobPreferences);
authRouter.get("/verify-email", validateEmail);
authRouter.post("/login", loginUser);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.put("/update-password", validateAccessToken, updatePassword);
authRouter.post("/token", validateRefreshToken, generateNewToken);
authRouter.get("/get_profile", validateAccessToken, getProfile);
authRouter.put("/update_profile", validateAccessToken, upload.single("profile_pic"), updateProfile);

export { authRouter };
