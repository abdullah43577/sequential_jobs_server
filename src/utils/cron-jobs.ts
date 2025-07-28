import User from "../models/users.model";
import cron from "node-cron";
import { sendResumeReminderEmail } from "./services/emails/ResumeReminderEmailService";
import { createAndSendNotification } from "./services/notifications/sendNotification";
import { NotificationStatus, NotificationType } from "../models/notifications.model";
import { sendTrialExpiredEmail } from "./services/emails/TrialExpiredEmailService";
import { sendGracePeriodNotificationEmail } from "./services/emails/gracePeriodEmailService";
import { sendSubscriptionExpiredEmail } from "./services/emails/subscriptionExpiredEmailService";

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
          message: "Your free trial period has ended, and your account has been downgraded to the Sequential Freemium plan. You still have access to basic features, but to continue enjoying premium benefits, consider upgrading your subscription.",
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

// Function to handle paid subscription expiration with grace period logic
export const checkPaidSubscriptions = async function () {
  try {
    const currentDate = new Date();

    // Find users with expired paid subscriptions (not trials)
    const expiredPaidUsers = await User.find({
      is_trial: false,
      subscription_status: { $in: ["payment_successful", "pending"] },
      subscription_end: { $lt: currentDate },
      subscription_tier: { $ne: "Sequential Freemium" }, // Don't process freemium users
    });

    await Promise.all(
      expiredPaidUsers.map(async user => {
        // Check if user has a grace period
        if (user.grace_period && user.grace_period.trim() !== "") {
          // Parse grace period (assuming format like "7d", "30d", etc.)
          const gracePeriodMatch = user.grace_period.match(/^(\d+)([dD])$/);

          if (gracePeriodMatch) {
            const graceDays = parseInt(gracePeriodMatch[1]);
            const graceEndDate = new Date(user.subscription_end);
            graceEndDate.setDate(graceEndDate.getDate() + graceDays);

            if (currentDate <= graceEndDate) {
              // Still within grace period - send reminder but don't downgrade
              console.log(`User ${user.email} is in grace period until ${graceEndDate}`);

              // Send grace period notification (only once per day to avoid spam)
              const lastNotificationDate = user.lastLogin?.toDateString();
              const currentDateString = currentDate.toDateString();

              if (lastNotificationDate !== currentDateString) {
                await sendGracePeriodNotificationEmail({
                  email: user.email,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  graceEndDate: graceEndDate,
                  btnUrl: "", // Add your payment/upgrade URL
                });

                await createAndSendNotification({
                  recipient: user._id,
                  sender: null as any,
                  title: "⏰ Grace Period Active - Renew Soon",
                  message: `Your subscription expired but you're in a grace period until ${graceEndDate.toLocaleDateString()}. Renew now to avoid losing access to premium features.`,
                  type: NotificationType.MESSAGE,
                  status: NotificationStatus.UNREAD,
                  isSystemGenerated: true,
                });
              }

              return; // Skip downgrade for this user
            }
          }
        }

        // No grace period or grace period has expired - downgrade to freemium
        const previousTier = user.subscription_tier;
        user.subscription_tier = "Sequential Freemium";
        user.subscription_status = "unpaid";
        user.grace_period = ""; // Clear grace period
        await user.save();

        // Send subscription expired email
        await sendSubscriptionExpiredEmail({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          previousTier: previousTier,
          btnUrl: "", // Add your upgrade URL
        });

        // Send notification
        await createAndSendNotification({
          recipient: user._id,
          sender: null as any,
          title: "💳 Subscription Expired",
          message: `Your ${previousTier} subscription has expired and your account has been downgraded to Sequential Freemium. Upgrade anytime to regain access to premium features.`,
          type: NotificationType.MESSAGE,
          status: NotificationStatus.UNREAD,
          isSystemGenerated: true,
        });

        console.log(`User ${user.email} downgraded from ${previousTier} to Sequential Freemium`);
      })
    );

    console.log(`Processed ${expiredPaidUsers.length} expired paid subscriptions.`);
  } catch (error) {
    console.error("Error checking paid subscriptions:", error);
  }
};

// Function to send subscription expiry warnings (e.g., 3 days before expiry)
export const sendSubscriptionExpiryWarnings = async function () {
  try {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 3); // 3 days from now

    // Find users whose subscriptions expire in 3 days
    const soonToExpireUsers = await User.find({
      subscription_status: { $in: ["payment_successful", "trial"] },
      subscription_end: {
        $gte: new Date(warningDate.toDateString()), // Start of warning day
        $lt: new Date(warningDate.getTime() + 24 * 60 * 60 * 1000), // End of warning day
      },
      subscription_tier: { $ne: "Sequential Freemium" },
    });

    await Promise.all(
      soonToExpireUsers.map(async user => {
        // Send warning email and notification
        // You'll need to create these email services

        await createAndSendNotification({
          recipient: user._id,
          sender: null as any,
          title: "⚠️ Subscription Expiring Soon",
          message: `Your ${user.subscription_tier} subscription expires in 3 days (${user.subscription_end.toLocaleDateString()}). Renew now to avoid interruption.`,
          type: NotificationType.MESSAGE,
          status: NotificationStatus.UNREAD,
          isSystemGenerated: true,
        });
      })
    );

    console.log(`Sent expiry warnings to ${soonToExpireUsers.length} users.`);
  } catch (error) {
    console.error("Error sending subscription expiry warnings:", error);
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

// Set up cron job to run daily at midnight for subscription checks
export const setupSubscriptionCronJobs = () => {
  // Run every day at midnight - check for expired subscriptions
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily subscription check...");
    await checkTrialSubscriptions();
    await checkPaidSubscriptions();
  });

  // Run every day at 9 AM - send expiry warnings
  cron.schedule("0 9 * * *", async () => {
    console.log("Running subscription expiry warnings...");
    await sendSubscriptionExpiryWarnings();
  });
};

// Run every 3 days at 9 AM for resume reminders
export const setupResumeReminder = () => {
  cron.schedule("0 9 */3 * *", async () => {
    console.log("Running resume reminder...");
    await RemindJobSeekerToCompleteAcctSetup();
  });
};
