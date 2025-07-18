import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import User from "../../models/users.model";
import { stripe } from "../../server";

const createCheckoutSessionAdmin = async function (req: IUserRequest, res: Response) {
  // try {
  //   const { userId } = req.params;
  //   const { subscription_tier_name } = req.body;
  //   if (!subscription_tier_name)
  //     return res.status(400).json({
  //       message: "Subscription tier name is required!",
  //     });
  //   // Convert plan name to tier
  //   const tierMapping: Record<string, string> = {
  //     Freemium: "freemium",
  //     Standard: "standard",
  //     Professional: "pro",
  //     "Super Professional": "superPro",
  //   };
  //   const tier = tierMapping[subscription_tier_name];
  //   if (!tier || tier === "freemium")
  //     return res.status(400).json({
  //       success: false,
  //       message: tier === "freemium" ? "Freemium plan doesn't require payment" : "Invalid subscription tier",
  //     });
  //   // Get the plan details for the selected tier
  //   const plan = pricingPlans[tier as keyof typeof pricingPlans];
  //   if (!plan || !plan.stripePrice)
  //     return res.status(400).json({
  //       message: "Invalid subscription tier or price not configured",
  //     });
  //   const user = await User.findById(userId).select("email subscription_tier").lean();
  //   if (!user)
  //     return res.status(404).json({
  //       success: false,
  //       message: "User not found!",
  //     });
  //   if (user.subscription_tier === getFullPlanName(tier)) return res.status(400).json({ message: "You're already on this plan" });
  //   // Create a checkout session
  //   const session = await stripe.checkout.sessions.create({
  //     customer_email: user.email,
  //     line_items: [
  //       {
  //         price: plan.stripePrice,
  //         quantity: 1,
  //       },
  //     ],
  //     mode: "subscription",
  //     success_url: `${process.env.CLIENT_URL}/dashboard/admin/subscriptions?status=thank_you`,
  //     cancel_url: `${process.env.CLIENT_URL}/dashboard/admin/subscriptions?status=error`,
  //     metadata: {
  //       userId,
  //       subscriptionTier: tier,
  //     },
  //   } as any);
  //   // Return the session details
  //   return res.status(200).json({
  //     success: true,
  //     status: "success",
  //     status_code: 200,
  //     message: "Checkout session created successfully",
  //     data: {
  //       session_id: session.id,
  //       redirect_url: session.url,
  //     },
  //   });
  // } catch (error) {
  //   handleErrors({ res, error });
  // }
};

const changeUserPlan = async function (req: IUserRequest, res: Response) {
  // try {
  //   const { userId } = req.params;
  //   const { subscription_tier_name } = req.body;
  //   if (!userId) return res.status(400).json({ message: "User ID is required" });
  //   if (!subscription_tier_name) return res.status(400).json({ message: "Subscription Tier Name is required" });
  //   // Convert plan name to tier
  //   const tierMapping: Record<string, string> = {
  //     Freemium: "freemium",
  //     Standard: "standard",
  //     Professional: "pro",
  //     "Super Professional": "superPro",
  //   };
  //   const tier = tierMapping[subscription_tier_name];
  //   // Get the plan details for the selected tier
  //   const plan = pricingPlans[tier as keyof typeof pricingPlans];
  //   if (!plan || !plan.stripePrice)
  //     return res.status(400).json({
  //       message: "Invalid subscription tier or price not configured",
  //     });
  //   // Calculate new subscription end date (30 days from now)
  //   const subscriptionEnd = new Date();
  //   subscriptionEnd.setDate(subscriptionEnd.getDate() + 30);
  //   await User.findByIdAndUpdate(userId, {
  //     subscription_tier: getFullPlanName(tier),
  //     subscription_status: "payment_successful", // Admin override so marking as successful
  //     subscription_start: new Date(),
  //     subscription_end: subscriptionEnd,
  //     is_trial: false,
  //   });
  //   return res.status(200).json({ message: "User Successfully Upgraded" });
  // } catch (error) {
  //   handleErrors({ res, error });
  // }
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
