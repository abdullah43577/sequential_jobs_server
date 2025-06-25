import User from "../models/users.model";
import cron from "node-cron";
import { sendResumeReminderEmail } from "./services/emails/ResumeReminderEmailService";
import { createAndSendNotification } from "./services/notifications/sendNotification";
import { NotificationStatus, NotificationType } from "../models/notifications.model";
import { sendTrialExpiredEmail } from "./services/emails/TrialExpiredEmailService";

// Function to check and handle expired trial subscriptions
export const checkTrialSubscriptions = async function () {
  try {
    const currentDate = new Date();

    // Find users with expired trials
    const expiredTrialUsers = await User.find({
      is_trial: true,
      subscription_status: "trial",
      subscription_end: { $lt: currentDate },
    });

    await Promise.all(
      expiredTrialUsers.map(async user => {
        user.subscription_tier = "Sequential Freemium";
        user.subscription_status = "unpaid";
        user.is_trial = false;
        await user.save();

        //* send email
        await sendTrialExpiredEmail({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          btnUrl: "",
        });

        //* send notification
        await createAndSendNotification({
          recipient: user._id,
          sender: null as any,
          title: "⚠️ Your Trial Has Ended",
          message: "Your free trial period has ended, and your account has been downgraded to the Sequential Freemium plan. You still have access to basic features, but to continue enjoying premium benefits, consider upgrading your subscription.`,",
          type: NotificationType.MESSAGE,
          status: NotificationStatus.UNREAD,
          isSystemGenerated: true,
        });
      })
    );

    console.log(`${expiredTrialUsers.length} trial subscriptions expired and reverted to freemium.`);
  } catch (error) {
    console.error("Error checking trial subscriptions:", error);
  }
};

export const RemindJobSeekerToCompleteAcctSetup = async function () {
  try {
    //* find all job-seekers without resume
    const users = await User.find({ role: "job-seeker", resume: null });

    await Promise.all(
      users.map(async user => {
        //* send email to seeker
        await sendResumeReminderEmail({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          btnUrl: "",
        });

        //* send notification to user
        await createAndSendNotification({
          recipient: user._id,
          sender: "system",
          title: "📄 Complete Your Profile - Upload Your Resume",
          message: "You're almost there! Uploading your resume will boost your chances of getting hired and help us match you with better opportunities.",
          type: NotificationType.MESSAGE,
          status: NotificationStatus.UNREAD,
        });
      })
    );
  } catch (error) {
    console.error("Error reminding job seeker to complete account setup", error);
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

// Run every 3 days at 9 AM
export const setupResumeReminder = () => {
  cron.schedule("0 9 */3 * *", async () => {
    console.log("Running daily resume reminder...");
    await RemindJobSeekerToCompleteAcctSetup();
  });
};
