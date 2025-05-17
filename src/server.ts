import "dotenv/config";
import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
const { PORT, STRIPE_SECRET_KEY } = process.env;
import { notificationRouter } from "./routes/notificationRouter";
import { connectDB } from "./helper/connectDB";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { authRouter } from "./routes/authRoutes";
import { getSocketIO, initializeSocket } from "./helper/socket";
import { companyRouter } from "./routes/employer/routes.employer";
import { seekerRouter } from "./routes/seeker/routes.seeker";
import passport from "passport";
import { passportSetup } from "./utils/passportSetup";
import { landingRouter } from "./routes/landingRoutes";
import { eventsRouter } from "./routes/eventRoutes";
import { adminRouter } from "./routes/admin/routes.admin";
import Stripe from "stripe";
import { initializeStripeProducts } from "./utils/initializeStripe";

export const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
  timeout: 10000, // 10 seconds
});

const app = express();

app.use("/api/employer/payment/webhook", express.raw({ type: "application/json" }));

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
app.use(passport.initialize());
passportSetup();

// routes
app.use("/api", landingRouter);
app.use("/api/auth", authRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/employer", companyRouter);
app.use("/api/seeker", seekerRouter);
app.use("/api/admin", adminRouter);
app.use("/api/events", eventsRouter);

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
  //* leave this here it's important to initialize the stripe products
  await initializeStripeProducts();
  // setupSubscriptionCronJobs()
});

initializeSocket(server);
