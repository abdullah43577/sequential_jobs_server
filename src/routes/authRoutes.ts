import { Router } from "express";
import { generateNewToken, loginUser, createUser, forgotPassword, testApi, validateEmail, resetPassword, getProfile } from "../controllers/auth.controller";
import { validateAccessToken, validateRefreshToken } from "../middleware/validateToken";

const authRouter = Router();

authRouter.get("/", testApi);
authRouter.post("/create-user", createUser);
authRouter.get("/verify-email", validateEmail);
authRouter.post("/login", loginUser);
authRouter.post("/forgot-password", forgotPassword);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/token", validateRefreshToken, generateNewToken);
authRouter.get("/get_profile", validateAccessToken, getProfile);

export { authRouter };
