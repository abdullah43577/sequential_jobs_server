import { Router } from "express";
import { generateNewToken, loginUser, logout, createUser, resetPassword, testApi } from "../controllers/auth.controller";
import { validateAccessToken, validateRefreshToken } from "../middleware/validateToken";

const authRouter = Router();

authRouter.get("/", testApi);
authRouter.post("/create-user", createUser);
authRouter.post("/login", loginUser);
authRouter.post("/reset-password", resetPassword);
authRouter.post("/token", validateRefreshToken, generateNewToken);
authRouter.delete("/logout", validateAccessToken, logout);

export { authRouter };
