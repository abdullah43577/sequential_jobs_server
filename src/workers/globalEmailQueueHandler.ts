import { Queue, Worker } from "bullmq";
import { connection } from "./redisConnection";

export const emailQueue = new Queue("Emails", { connection });

// Job handler registry
type EmailJobHandler = (data: any | any[]) => Promise<any>;

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
    const { type, ...data } = job.data;

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
    concurrency: 1, // ✅ GLOBAL rate limiting - only 1 email at a time
    limiter: {
      max: 2, // ✅ Maximum 2 emails per second across ENTIRE app
      duration: 1000,
    },
  }
);

globalEmailWorker.on("completed", job => {
  console.log(`Email sent successfully`);
});

globalEmailWorker.on("failed", (job, err) => {
  console.log(`Email job has failed with ${err.message}`);
});

globalEmailWorker.on("error", err => {
  console.error(err);
});

// Helper function to queue any email type
export const queueEmail = (type: string, data: any) => emailQueue.add("send_email", { type, ...data }, { removeOnComplete: true, removeOnFail: true });

// Helper function to queue emails in bulk
export const queueBulkEmail = (type: string, emailData: any[]) => {
  const jobs = emailData.map((data, index) => ({
    name: "send_email",
    data: { type, ...data },
    opts: {
      removeOnComplete: 10,
      removeOnFail: 50,
      delay: index * 100, // Optional: stagger jobs by 100ms each
    },
  }));

  return emailQueue.addBulk(jobs);
};

export { globalEmailWorker };
