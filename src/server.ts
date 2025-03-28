import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
const { PORT } = process.env;
import { router } from "./routes/router";
import { connectDB } from "./helper/connectDB";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { authRouter } from "./routes/authRoutes";
import { initializeSocket } from "./helper/socket";
import { companyRouter } from "./routes/employer/routes.employer";
import { seekerRouter } from "./routes/seeker/routes.seeker";

const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://sequentialjobs.com", "https://sequential-jobs.vercel.app"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());
app.use(helmet());

// routes
app.use("/api", router);
app.use("/api/auth", authRouter);
app.use("/api/employer", companyRouter);
app.use("/api/seeker", seekerRouter);

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested endpoint does not exist!",
    explorableSolutions: {
      solution1: 'ensure the "METHOD" used to call the endpoint is correct!',
      solution2: "ensure the relative paths to the server url is defined correctly",
    },
  });
});

const server = app.listen(PORT, async () => {
  await connectDB();
  console.log(`server started on http://localhost:${PORT}`);

  // const d = await User.updateMany({ resume: { $exists: false } }, { $set: { resume: null } });
  // console.log("I ran");
});

initializeSocket(server);
