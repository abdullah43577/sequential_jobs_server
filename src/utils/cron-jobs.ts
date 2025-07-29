import User from "../models/users.model";
import { createAndSendNotification } from "./services/notifications/sendNotification";
import { NotificationStatus, NotificationType } from "../models/notifications.model";
import { emailQueue, queueBulkEmail } from "../workers/globalEmailQueueHandler";

export const SCHEDULED_JOB_KEY = {
  TRIAL_EXPIRED: "trial_expired_email",
  GRACE_PERIOD_NOTIFICATION: "grace_period_notification_email",
  SUBSCRIPTION_EXPIRED: "subscription_expired_email",
  SUBSCRIPTION_EXPIRY_WARNING: "subscription_expiry_warning",
  RESUME_REMINDER: "resume_reminder_email",
};

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

    // Prepare bulk email data for trial expired emails
    const trialExpiredEmails = expiredTrialUsers.map(user => ({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      btnUrl: "",
    }));

    // Queue all trial expired emails in bulk
    if (trialExpiredEmails.length > 0) {
      await queueBulkEmail(SCHEDULED_JOB_KEY.TRIAL_EXPIRED, trialExpiredEmails);
    }

    // Update user records and send notifications
    await Promise.all(
      expiredTrialUsers.map(async user => {
        user.subscription_tier = "Sequential Freemium";
        user.subscription_status = "unpaid";
        user.is_trial = false;
        await user.save();

        // Send notification
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
      subscription_tier: { $ne: "Sequential Freemium" },
    });

    const gracePeriodEmails: any[] = [];
    const subscriptionExpiredEmails: any[] = [];

    await Promise.all(
      expiredPaidUsers.map(async user => {
        // Check if user has a grace period
        if (user.grace_period && user.grace_period.trim() !== "") {
          const gracePeriodMatch = user.grace_period.match(/^(\d+)([dD])$/);

          if (gracePeriodMatch) {
            const graceDays = parseInt(gracePeriodMatch[1]);
            const graceEndDate = new Date(user.subscription_end);
            graceEndDate.setDate(graceEndDate.getDate() + graceDays);

            if (currentDate <= graceEndDate) {
              console.log(`User ${user.email} is in grace period until ${graceEndDate}`);

              // Check if we should send grace period notification
              const lastNotificationDate = user.lastLogin?.toDateString();
              const currentDateString = currentDate.toDateString();

              if (lastNotificationDate !== currentDateString) {
                gracePeriodEmails.push({
                  email: user.email,
                  first_name: user.first_name,
                  last_name: user.last_name,
                  graceEndDate: graceEndDate,
                  btnUrl: "",
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

        // No grace period or grace period has expired - prepare for downgrade
        const previousTier = user.subscription_tier;
        user.subscription_tier = "Sequential Freemium";
        user.subscription_status = "unpaid";
        user.grace_period = "";
        await user.save();

        // Add to subscription expired emails
        subscriptionExpiredEmails.push({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          previousTier: previousTier,
          btnUrl: "",
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

    // Queue bulk emails
    if (gracePeriodEmails.length > 0) {
      await queueBulkEmail(SCHEDULED_JOB_KEY.GRACE_PERIOD_NOTIFICATION, gracePeriodEmails);
    }

    if (subscriptionExpiredEmails.length > 0) {
      await queueBulkEmail(SCHEDULED_JOB_KEY.SUBSCRIPTION_EXPIRED, subscriptionExpiredEmails);
    }

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
        $gte: new Date(warningDate.toDateString()),
        $lt: new Date(warningDate.getTime() + 24 * 60 * 60 * 1000),
      },
      subscription_tier: { $ne: "Sequential Freemium" },
    });

    // Send notifications (you could also create an email handler for this if needed)
    await Promise.all(
      soonToExpireUsers.map(async user => {
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
    // Find all job-seekers without resume
    const users = await User.find({ role: "job-seeker", resume: null });

    // Prepare bulk email data
    const resumeReminderEmails = users.map(user => ({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      btnUrl: "",
    }));

    // Queue bulk emails
    if (resumeReminderEmails.length > 0) {
      await queueBulkEmail(SCHEDULED_JOB_KEY.RESUME_REMINDER, resumeReminderEmails);
    }

    // Send notifications
    await Promise.all(
      users.map(async user => {
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

    console.log(`Sent resume reminders to ${users.length} job seekers.`);
  } catch (error) {
    console.error("Error reminding job seeker to complete account setup", error);
  }
};

// BullMQ Scheduled Jobs Setup
export const setupBullMQScheduledJobs = async () => {
  try {
    // Daily subscription checks at midnight (00:00)
    await emailQueue.add(
      "daily_subscription_check",
      { jobType: "subscription_check" },
      {
        repeat: {
          pattern: "0 0 * * *", // Every day at midnight
        },
        removeOnComplete: 5,
        removeOnFail: 10,
      }
    );

    // Daily subscription expiry warnings at 9 AM
    await emailQueue.add(
      "daily_expiry_warnings",
      { jobType: "expiry_warnings" },
      {
        repeat: {
          pattern: "0 9 * * *", // Every day at 9 AM
        },
        removeOnComplete: 5,
        removeOnFail: 10,
      }
    );

    // Resume reminders every 3 days at 9 AM
    await emailQueue.add(
      "resume_reminders",
      { jobType: "resume_reminder" },
      {
        repeat: {
          pattern: "0 9 */3 * *", // Every 3 days at 9 AM
        },
        removeOnComplete: 5,
        removeOnFail: 10,
      }
    );

    console.log("BullMQ scheduled jobs setup completed");
  } catch (error) {
    console.error("Error setting up BullMQ scheduled jobs:", error);
  }
};
