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
import { initializeSocket } from "./helper/socket";
import { companyRouter } from "./routes/employer/routes.employer";
import { seekerRouter } from "./routes/seeker/routes.seeker";
import passport from "passport";
import { passportSetup } from "./utils/passportSetup";
import { landingRouter } from "./routes/landingRoutes";
import { eventsRouter } from "./routes/eventRoutes";
import { adminRouter } from "./routes/admin/routes.admin";
import Stripe from "stripe";
import { ticketRouter } from "./routes/ticketRoutes";
import { emailWebhook } from "./routes/emailHookRoutes";
import { setupBullMQScheduledJobs } from "./utils/cron-jobs";
import { getRegisteredHandlersCount, initializeEmailWorker, isWorkerReady, queueEmail } from "./workers/globalEmailQueueHandler";
import { initializeEmailHandlers } from "./workers/registerWorkers";

const app = express();

export const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
  timeout: 10000, // 10 seconds
});

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
      "https://tz.sequentialjobs.com",
      "https://ma.sequentialjobs.com",
      "https://tn.sequentialjobs.com",
      "https://dz.sequentialjobs.com",
      "https://zw.sequentialjobs.com",
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
app.use("/api/ticket", ticketRouter);
app.use("/api/emails", emailWebhook);

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

const initializeEmailSystem = async () => {
  try {
    console.log("🔧 Initializing email system...");

    // Step 1: Register all email handlers
    initializeEmailHandlers();
    console.log(`📝 Registered ${getRegisteredHandlersCount()} email handlers`);

    // Step 2: Initialize the worker
    initializeEmailWorker();

    // Step 3: Wait for worker to be ready
    let attempts = 0;
    const maxAttempts = 10;

    while (!isWorkerReady() && attempts < maxAttempts) {
      console.log(`⏳ Waiting for email worker... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!isWorkerReady()) {
      throw new Error("Email worker failed to start within timeout");
    }

    console.log("✅ Email system initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize email system:", error);
    throw error;
  }
};

const cronJobs = async function () {
  try {
    console.log("EXECUTING CRON JOBS....");
    await setupBullMQScheduledJobs();
    console.log("✅ Cron jobs initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize cron jobs:", error);
  }
};

// const testEmails = async function () {
//   try {
//     console.log("🧪 Starting email test...");

//     const emailsToTest = [
//       "tester@yopmail.com",
//       "elitefosa@gmail.com",
//       "sequentialtest1@yopmail.com",
//       "sequentialtest2@yopmail.com",
//       "sequentialtest3@yopmail.com",
//       "sequentialtest4@yopmail.com",
//       "Sequentialtest5@yopmail.com",
//       "sequentialtest6@yopmail.com",
//       "sequentialtest@yopmail.com",
//       "sequentialtest7@yopmail.com",
//       "sequentialtest8@yopmail.com",
//       "sequentialtest9@yopmail.com",
//       "sequentialtest10@yopmail.com",
//       "sequentialtest11@yopmail.com",
//       "officialayo540@gmail.com",
//     ];

//     const emailPromises = [];

//     for (let i = 0; i < emailsToTest.length; i++) {
//       console.log(`📧 Queueing email ${i + 1}/20`);

//       const emailPromise = queueEmail(JOB_KEY.REGISTRATION_SEEKER, {
//         email: emailsToTest[i],
//         name: "Abdullah",
//         verificationToken: "asdfasd",
//       });

//       emailPromises.push(emailPromise);
//     }

//     const results = await Promise.allSettled(emailPromises);

//     const successful = results.filter(r => r.status === "fulfilled").length;
//     const failed = results.filter(r => r.status === "rejected").length;

//     console.log(`📊 Email test results: ${successful} successful, ${failed} failed`);

//     // Log any failures
//     results.forEach((result, index) => {
//       if (result.status === "rejected") {
//         console.error(`❌ Email ${index + 1} failed:`, result.reason);
//       }
//     });
//   } catch (error) {
//     console.error("❌ Error in test emailss:", error);
//   }
// };

const server = app.listen(PORT, async () => {
  try {
    console.log("Connecting to DB....");
    await connectDB();
    console.log(`server started on http://localhost:${PORT}`);

    // Initialize email system FIRST
    const emailSystemReady = await initializeEmailSystem();
    if (!emailSystemReady) {
      console.error("❌ Email system failed to initialize. Continuing without email functionality.");
      return;
    }

    // EXECUTE CRON JOBS (only if email system is ready)

    await cronJobs();
  } catch (error) {
    console.error("Error starting server and connecting to DB", error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

initializeSocket(server);
