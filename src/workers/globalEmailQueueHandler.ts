import { Queue, Worker } from "bullmq";
import { connection } from "./redisConnection";
import { checkPaidSubscriptions, checkTrialSubscriptions, RemindJobSeekerToCompleteAcctSetup, sendSubscriptionExpiryWarnings } from "../utils/cron-jobs";

export const emailQueue = new Queue("Emails", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

// Job handler registry
type EmailJobHandler = (data: any) => Promise<any>;

const jobHandlers: Record<string, EmailJobHandler> = {};

// Register job handlers
export const registerEmailHandler = (type: string, handler: EmailJobHandler) => {
  jobHandlers[type] = handler;
};

let globalEmailWorker: Worker | null = null;

export const initializeEmailWorker = function () {
  try {
    if (globalEmailWorker) {
      console.log("⚠️ Email worker already initialized");
      return globalEmailWorker;
    }

    // Single global worker - handles ALL email types
    globalEmailWorker = new Worker(
      "Emails",
      async job => {
        try {
          const { type, jobType, ...data } = job.data;

          // Handle scheduled jobss
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
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
      {
        connection,
        concurrency: 5, // ✅ GLOBAL rate limiting - only 5 email at a times
        limiter: {
          max: 10, // ✅ Maximum 2 emails per second across ENTIRE app
          duration: 1000,
        },
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
  } catch (error) {
    throw error;
  }
};

console.log("Worker is initialized and handler registered");

// Helper function to queue any email type
export const queueEmail = async (type: string, data: any) => {
  try {
    if (!globalEmailWorker || !globalEmailWorker.isRunning()) {
      throw new Error("Email worker is not running. Call initializeEmailWorker() first.");
    }

    const job = await emailQueue.add(
      "send_email",
      { type, ...data },
      {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );
    console.log(`📨 Queued email job: ${job.id} - Type: ${type} for ${data.email}`);
    return job;
  } catch (error) {
    console.error("❌ Failed to queue email:", error);
    throw error;
  }
};

// console.log(queueEmail)

// Helper function to queue emails in bulk
export const queueBulkEmail = async (type: string, emailData: any[]) => {
  try {
    if (!globalEmailWorker || !globalEmailWorker.isRunning()) {
      throw new Error("Email worker is not running. Call initializeEmailWorker() first.");
    }

    const jobs = emailData.map((data, index) => ({
      name: "send_email",
      data: { type, ...data },
      opts: {
        removeOnComplete: 10,
        removeOnFail: 50,
        delay: index * 500, // Space out jobs by 500ms each to respect rate limits
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    }));

    const result = await emailQueue.addBulk(jobs);
    console.log(`📨 Queued ${jobs.length} bulk email jobs for type: ${type}`);
    return result;
  } catch (error) {
    console.error("❌ Failed to queue bulk emails:", error);
    throw error;
  }
};

// Helper function to queue scheduled jobs (for manual triggering if needed)
export const queueScheduledJob = async (jobType: string, data: any = {}) => {
  try {
    if (!globalEmailWorker || !globalEmailWorker.isRunning()) {
      throw new Error("Email worker is not running. Call initializeEmailWorker() first.");
    }

    const job = await emailQueue.add(
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
    console.log(`📅 Queued scheduled job: ${job.id} - Type: ${jobType}`);
    return job;
  } catch (error) {
    console.error("❌ Failed to queue scheduled job:", error);
    throw error;
  }
};

// Function to get registered handlers count
export const getRegisteredHandlersCount = () => {
  return Object.keys(jobHandlers).length;
};

// Function to check if worker is ready
export const isWorkerReady = () => {
  return globalEmailWorker?.isRunning() || false;
};

// Function to gracefully close worker
export const closeWorker = async () => {
  await globalEmailWorker?.close();
};

export { globalEmailWorker };
