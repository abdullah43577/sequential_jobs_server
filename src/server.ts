import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
const { PORT, SESSION_SECRET } = process.env;
import { notificationRouter } from "./routes/notificationRouter";
import { connectDB } from "./helper/connectDB";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { authRouter } from "./routes/authRoutes";
import { initializeSocket } from "./helper/socket";
import { companyRouter } from "./routes/employer/routes.employer";
import { seekerRouter } from "./routes/seeker/routes.seeker";
import passport from "passport";
import { passportSetup } from "./utils/passportSetup";
import session from "express-session";

const app = express();

app.use(morgan("dev"));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://sequentialjobs.com",
      "https://ng.sequentialjobs.com",
      "https://gh.sequentialjobs.com",
      "https://ae.sequentialjobs.com",
      "https://gb.sequentialjobs.com",
      "https://ca.sequentialjobs.com",
      "https://ke.sequentialjobs.com",
      "https://ph.sequentialjobs.com",
      "https://sequential-jobs.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(cookieParser());
app.use(helmet());
app.use(
  session({
    secret: SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
passportSetup();

// routes
app.use("/api/notifications", notificationRouter);
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

  // const d = await Job.collection.updateMany({ "applicants.applicant.has_taken_application_test": { $exists: true } }, { $unset: { "applicants.$.has_taken_application_test": false } });
  // console.log("I ran");
});

initializeSocket(server);
