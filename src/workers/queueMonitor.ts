import { emailQueue } from "../workers/globalEmailQueueHandler";

export const getQueueStats = async () => {
  try {
    const waiting = await emailQueue.getWaiting();
    const active = await emailQueue.getActive();
    const completed = await emailQueue.getCompleted();
    const failed = await emailQueue.getFailed();

    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length,
    };

    console.log("📊 Queue Stats:", stats);
    return stats;
  } catch (error) {
    console.error("❌ Error getting queue stats:", error);
    return null;
  }
};

export const getFailedJobs = async () => {
  try {
    const failed = await emailQueue.getFailed();
    console.log(
      "❌ Failed Jobs:",
      failed.map(job => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }))
    );
    return failed;
  } catch (error) {
    console.error("❌ Error getting failed jobs:", error);
    return [];
  }
};

export const cleanQueue = async () => {
  try {
    // Clean completed jobs older than 1 hour
    await emailQueue.clean(60 * 60 * 1000, 100, "completed");

    // Clean failed jobs older than 24 hours
    await emailQueue.clean(24 * 60 * 60 * 1000, 100, "failed");

    console.log("✅ Queue cleaned successfully");
  } catch (error) {
    console.error("❌ Error cleaning queue:", error);
  }
};

// Add this route to your server for monitoring (optional)
export const createMonitoringRoute = (app: any) => {
  app.get("/api/admin/queue-stats", async (req: any, res: any) => {
    const stats = await getQueueStats();
    const failedJobs = await getFailedJobs();

    res.json({
      stats,
      failedJobs: failedJobs.slice(0, 10), // Only show last 10 failed jobs
    });
  });

  app.post("/api/admin/clean-queue", async (req: any, res: any) => {
    await cleanQueue();
    res.json({ message: "Queue cleaned successfully" });
  });
};
