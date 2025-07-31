import { Queue, Worker } from "bullmq";
import { connection } from "./redisConnection";
import { checkPaidSubscriptions, checkTrialSubscriptions, RemindJobSeekerToCompleteAcctSetup, sendSubscriptionExpiryWarnings } from "../utils/cron-jobs";

export const emailQueue = new Queue("Emails", { connection });

// Job handler registry
type EmailJobHandler = (data: any) => Promise<any>;

const jobHandlers: Record<string, EmailJobHandler> = {};

// Register job handlers
export const registerEmailHandler = (type: string, handler: EmailJobHandler) => {
  jobHandlers[type] = handler;
};

// {"interview_candidate_invite": async () => {...}}

// Single global worker - handles ALL email types
const globalEmailWorker = new Worker(
  "Emails",
  async job => {
    const { type, jobType, ...data } = job.data;

    // Handle scheduled jobs
    if (jobType) {
      console.log(`Processing scheduled job: ${jobType}`);

      switch (jobType) {
        case "subscription_check":
          await checkTrialSubscriptions();
          await checkPaidSubscriptions();
          return { success: true, jobType, message: "Subscription check completed" };

        case "expiry_warnings":
          await sendSubscriptionExpiryWarnings();
          return { success: true, jobType, message: "Expiry warnings sent" };

        case "resume_reminder":
          await RemindJobSeekerToCompleteAcctSetup();
          return { success: true, jobType, message: "Resume reminders sent" };

        default:
          throw new Error(`Unknown scheduled job type: ${jobType}`);
      }
    }

    // Handle regular email jobs
    if (!type) {
      throw new Error("Job must have either 'type' or 'jobType' specified");
    }

    console.log(`Processing ${type} email for: ${data.email}`);

    const handler = jobHandlers[type];
    if (!handler) {
      throw new Error(`No handler registered for email type: ${type}`);
    }

    const result = await handler(data);
    return { success: true, email: data.email, type, result };
  },
  {
    connection,
    // concurrency: 2, // ✅ GLOBAL rate limiting - only 1 email at a time
    // limiter: {
    //   max: 2, // ✅ Maximum 2 emails per second across ENTIRE app
    //   duration: 1000,
    // },
  }
);

globalEmailWorker.on("completed", (job, result) => {
  if (result.jobType) {
    console.log(`Scheduled job '${result.jobType}' completed: ${result.message}`);
  } else {
    console.log(`Email sent successfully for type: ${result.type}`);
  }
});

globalEmailWorker.on("failed", (job, err) => {
  const jobData = job?.data;
  if (jobData?.jobType) {
    console.log(`Scheduled job '${jobData.jobType}' failed: ${err.message}`);
  } else {
    console.log(`Email job failed: ${err.message}`);
  }
});

globalEmailWorker.on("error", err => {
  console.error("Worker error:", err);
});

// Helper function to queue any email type
export const queueEmail = (type: string, data: any) =>
  emailQueue.add(
    "send_email",
    { type, ...data },
    {
      removeOnComplete: true,
      removeOnFail: true,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    }
  );

// console.log(queueEmail)

// Helper function to queue emails in bulk
export const queueBulkEmail = (type: string, emailData: any[]) => {
  const jobs = emailData.map((data, index) => ({
    name: "send_email",
    data: { type, ...data },
    opts: {
      removeOnComplete: 10,
      removeOnFail: 50,
      delay: index * 100, // Optional: stagger jobs by 100ms each
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  }));

  return emailQueue.addBulk(jobs);
};

// Helper function to queue scheduled jobs (for manual triggering if needed)
export const queueScheduledJob = (jobType: string, data: any = {}) =>
  emailQueue.add(
    `scheduled_${jobType}`,
    { jobType, ...data },
    {
      removeOnComplete: 5,
      removeOnFail: 10,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );

export { globalEmailWorker };
