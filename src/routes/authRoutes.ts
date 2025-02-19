import { Router } from "express";
import { generateNewToken, loginUser, logout, registerSeeker, resetPassword, testApi } from "../controllers/auth.controller";
import { validateAccessToken, validateRefreshToken } from "../middleware/validateToken";

const authRouter = Router();

authRouter.get("/", testApi);
authRouter.post("/create-seeker", registerSeeker);
authRouter.post("/login", loginUser);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/token", validateRefreshToken, generateNewToken);
authRouter.delete("/logout", validateAccessToken, logout);

export { authRouter };
