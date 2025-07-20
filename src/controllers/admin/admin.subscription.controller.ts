import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import User from "../../models/users.model";
import { stripe } from "../../server";

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
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const { newExpiry }: { userId: string; newExpiry: string } = req.body;
    if (!newExpiry) return res.status(400).json({ message: "new expiry date are required." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    user.subscription_end = new Date(newExpiry);
    await user.save();

    res.status(200).json({ message: "Subscription Expiry Updated Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { createCheckoutSessionAdmin, changeUserPlan, extendPlanExpiry };
