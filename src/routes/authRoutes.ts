import { Router } from "express";
import { generateNewToken, loginUser, logout, registerSeeker, testApi } from "../controllers/auth.controller";
import { validateAccessToken, validateRefreshToken } from "../middleware/validateToken";

const authRouter = Router();

authRouter.get("/", testApi);
authRouter.post("/create-seeker", registerSeeker);
authRouter.post("/login", loginUser);
authRouter.post("/token", validateRefreshToken, generateNewToken);
authRouter.delete("/logout", validateAccessToken, logout);

export { authRouter };
