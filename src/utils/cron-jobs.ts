import User from "../models/users.model";
import cron from "node-cron";

// Function to check and handle expired trial subscriptions
export const checkTrialSubscriptions = async () => {
  try {
    const currentDate = new Date();

    // Find users with expired trials
    const expiredTrialUsers = await User.find({
      is_trial: true,
      subscription_status: "trial",
      subscription_end: { $lt: currentDate },
    });

    // Update each expired trial user to freemium
    for (const user of expiredTrialUsers) {
      user.subscription_tier = "Sequential Freemium";
      user.subscription_status = "unpaid";
      user.is_trial = false;

      await user.save();

      // Optional: Send notification email about trial expiration
      // await sendTrialExpiredEmail(user.email);
    }

    console.log(`${expiredTrialUsers.length} trial subscriptions expired and reverted to freemium.`);
  } catch (error) {
    console.error("Error checking trial subscriptions:", error);
  }
};

// Set up cron job to run daily at midnight
export const setupSubscriptionCronJobs = () => {
  // Run every day at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily subscription check...");
    await checkTrialSubscriptions();
  });
};
