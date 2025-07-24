import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import User from "../../models/users.model";
import { stripe } from "../../server";
import { createAndSendNotification } from "../../utils/services/notifications/sendNotification";
import { NotificationStatus, NotificationType } from "../../models/notifications.model";

const createCheckoutSessionAdmin = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { subscription_tier_name, priceId } = req.body;

    if (!subscription_tier_name || !priceId)
      return res.status(400).json({
        message: "Subscription tier name and price ID is required!",
      });

    const user = await User.findById(userId).select("email subscription_tier").lean();

    if (!user) return res.status(404).json({ message: "user not found!" });

    const planName = subscription_tier_name === "Sequential Professional" ? "Sequential Pro" : subscription_tier_name;

    if (user.subscription_tier === planName) return res.status(400).json({ message: "You're already on this plan!" });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/dashboard/admin/subscriptions?status=thank_you`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/admin/subscriptions?status=error`,
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email,
        planName: subscription_tier_name,
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          userEmail: user.email,
        },
      },
    } as any);

    res.status(200).json({
      message: "Checkout session created sucecssfully",
      data: {
        session_id: session.id,
        redirect_url: session.url,
      },
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const changeUserPlan = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req.params;
    const { subscription_tier_name, priceId } = req.body;

    if (!subscription_tier_name || !priceId)
      return res.status(400).json({
        message: "Subscription tier name and price ID is required!",
      });

    const planName = subscription_tier_name === "Sequential Professional" ? "Sequential Pro" : subscription_tier_name;

    const subscriptionEnd = new Date();
    subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);

    await User.findByIdAndUpdate(userId, {
      subscription_tier: planName,
      subscription_status: "payment_successful", // Admin override to marking as successful
      subscription_start: new Date(),
      subdscription_end: subscriptionEnd,
      is_trial: false,
    });

    return res.status(200).json({ message: "User Successfully Upgraded" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const extendPlanExpiry = async function (req: IUserRequest, res: Response) {
  try {
    const { userId: adminId } = req;

    const { userId } = req.params;
    const { newExpiry } = req.body;

    // Input validation
    if (!userId?.trim()) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    if (!newExpiry) {
      return res.status(400).json({
        message: "New expiry date is required",
      });
    }

    // Validate and parse the new expiry date
    const newExpiryDate = new Date(newExpiry);
    if (isNaN(newExpiryDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Please provide a valid date.",
      });
    }

    // Validate that new expiry is in the future
    const currentDate = new Date();
    if (newExpiryDate <= currentDate) {
      return res.status(400).json({
        message: "New expiry date must be in the future",
      });
    }

    // Validate reasonable expiry extension (e.g., not more than 5 years in future)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5);
    if (newExpiryDate > maxFutureDate) {
      return res.status(400).json({
        message: "Expiry date cannot be more than 5 years in the future",
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.account_status === "deactivated") {
      return res.status(400).json({
        message: "Cannot extend expiry for deactivated accounts",
      });
    }

    if (user.subscription_tier === "Sequential Freemium") {
      return res.status(400).json({
        message: "Cannot extend expiry for freemium accounts",
      });
    }

    // Store old expiry for comparison
    const oldExpiry = user.subscription_end;
    const isExtension = newExpiryDate > oldExpiry;
    const daysDifference = Math.ceil((newExpiryDate.getTime() - oldExpiry.getTime()) / (1000 * 60 * 60 * 24));

    // Update subscription details
    user.subscription_end = newExpiryDate;

    // Optional: Update subscription status if extending
    if (isExtension && user.subscription_status === "unpaid") {
      user.subscription_status = "payment_successful";
    }

    // Clear grace period if extending significantly
    if (isExtension && user.grace_period) {
      user.grace_period = "";
    }

    await user.save();

    // Optional: Send notification to user
    await createAndSendNotification({
      recipient: userId as any,
      sender: adminId as string,
      title: isExtension ? "🎉 Subscription Extended" : "📅 Subscription Updated",
      message: isExtension ? `Great news! Your ${user.subscription_tier} subscription has been extended until ${newExpiryDate.toLocaleDateString()}.` : `Your subscription expiry date has been updated to ${newExpiryDate.toLocaleDateString()}.`,
      type: NotificationType.MESSAGE,
      status: NotificationStatus.UNREAD,
      isSystemGenerated: true,
    });

    res.status(200).json({
      message: `Subscription expiry ${isExtension ? "extended" : "updated"} successfully`,
    });
  } catch (error) {
    console.error("Error extending plan expiry:", error);
    handleErrors({ res, error });
  }
};

const extendGracePeriod = async function (req: IUserRequest, res: Response) {
  try {
    const { userId: adminId } = req;

    const { userId } = req.params;
    const { new_grace_period } = req.body;

    if (!new_grace_period?.trim() || !userId?.trim()) {
      return res.status(400).json({
        message: "Both new_grace_period and userId are required",
      });
    }

    // Validate grace period format
    const gracePeriodMatch = new_grace_period.match(/^(\d+)([dD])$/);
    if (!gracePeriodMatch) {
      return res.status(400).json({
        message: 'Grace period must be in format "7d", "30d", etc.',
      });
    }

    const graceDays = parseInt(gracePeriodMatch[1]);
    if (graceDays < 1 || graceDays > 90) {
      return res.status(400).json({
        message: "Grace period must be between 1 and 90 days",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.subscription_tier === "Sequential Freemium") {
      return res.status(400).json({
        message: "Grace period can only be extended for premium subscribers",
      });
    }

    if (user.account_status === "deactivated") {
      return res.status(400).json({
        message: "Cannot extend grace period for deactivated accounts",
      });
    }

    // Calculate grace period end date for logging
    const graceEndDate = new Date(user.subscription_end);
    graceEndDate.setDate(graceEndDate.getDate() + graceDays);

    // Update user
    user.grace_period = new_grace_period;
    await user.save();

    // Optional: Send notification to user
    await createAndSendNotification({
      recipient: userId as any,
      sender: adminId as string,
      title: "✅ Grace Period Extended",
      message: `Good news! Your grace period has been extended by ${graceDays} days until ${graceEndDate.toLocaleDateString()}. You now have additional time to renew your subscription.`,
      type: NotificationType.MESSAGE,
      status: NotificationStatus.UNREAD,
      isSystemGenerated: true,
    });

    res.status(200).json({
      message: `Grace period successfully extended for ${graceDays} days`,
    });
  } catch (error) {
    console.error("Error extending grace period:", error);
    handleErrors({ res, error });
  }
};

export { createCheckoutSessionAdmin, changeUserPlan, extendGracePeriod, extendPlanExpiry };
