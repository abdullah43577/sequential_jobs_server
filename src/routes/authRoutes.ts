import { Router } from "express";
import { generateNewToken, loginUser, createUser, forgotPassword, testApi, validateEmail, resetPassword, getProfile, updateProfile } from "../controllers/auth.controller";
import { validateAccessToken, validateRefreshToken } from "../middleware/validateToken";
import { upload } from "../utils/multerConfig";
import passport from "passport";
import { IUserRequest } from "../interface";

const authRouter = Router();

//* GOOGLE LOGIN
authRouter.get(
  "/google/job-seeker",
  (req, res, next) => {
    req.query.role = "job-seeker";
    next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Employer login
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
    const { user } = req;
    if (!user) return res.status(401).json({ error: "Authentication failed" });

    // Generate JWT token
    const userId = (user as any)._id.toString();
    // const token = jwt.sign(
    //   {
    //     userId,
    //     role: (user as any).role,
    //   },
    //   process.env.SESSION_SECRET as string,
    //   { expiresIn: "1d" }
    // );

    // Redirect to frontend with token
    // res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error });
  }
});
// authRouter.get("/google/callback/validate-session/:tokenId", validateOAuthSession);

authRouter.get("/", testApi);
authRouter.post("/create-user", createUser);
authRouter.get("/verify-email", validateEmail);
authRouter.post("/login", loginUser);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/token", validateRefreshToken, generateNewToken);
authRouter.get("/get_profile", validateAccessToken, getProfile);
authRouter.put("/update_profile", validateAccessToken, upload.single("profile_pic"), updateProfile);

export { authRouter };
