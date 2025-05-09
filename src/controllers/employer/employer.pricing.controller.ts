import { Request, Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import { pricingPlans, tierToFullPlanName } from "../../utils/subscriptionConfig";
import Stripe from "stripe";
import User from "../../models/users.model";
import { getStripePriceIds } from "../../utils/initializeStripe";
const { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } = process.env;

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
  timeout: 10000, // 10 seconds
});

const getPricingInfo = async function (req: IUserRequest, res: Response) {
  try {
    // Make sure Stripe prices are initialized
    await getStripePriceIds();

    // Get the latest pricing plans which now contain Stripe price IDs
    const allPricingPlans = Object.values(pricingPlans);

    res.status(200).json({
      data: {
        plans: allPricingPlans,
      },
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const createCheckoutSession = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { subscription_tier_name } = req.body;

    if (!subscription_tier_name)
      return res.status(400).json({
        success: false,
        message: "Subscription tier name is required!",
      });

    // Convert plan name to tier
    const tierMapping: Record<string, string> = {
      Freemium: "freemium",
      Standard: "standard",
      Professional: "pro",
      "Super Professional": "superPro",
    };

    const tier = tierMapping[subscription_tier_name];

    if (!tier || tier === "freemium")
      return res.status(400).json({
        success: false,
        message: tier === "freemium" ? "Freemium plan doesn't require payment" : "Invalid subscription tier",
      });

    // Get the plan details for the selected tier
    const plan = pricingPlans[tier as keyof typeof pricingPlans];

    if (!plan || !plan.stripePrice)
      return res.status(400).json({
        success: false,
        message: "Invalid subscription tier or price not configured",
      });

    const user = await User.findById(userId).select("email").lean();

    if (!user)
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      line_items: [
        {
          price: plan.stripePrice,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.CLIENT_URL}/dashboard/company/features&pricing/thank-you`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/company/features&pricing/error`,
      metadata: {
        userId,
        subscriptionTier: tier,
      },
    } as any);

    // Return the session details
    return res.status(200).json({
      success: true,
      status: "success",
      status_code: 200,
      message: "Checkout session created successfully",
      data: {
        session_id: session.id,
        redirect_url: session.url,
      },
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const handleWebhook = async function (req: Request, res: Response) {
  // Ensure the request body is available as a raw buffer
  const payload = req.body;
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    console.error("⚠️ No Stripe signature found in headers");
    return res.status(400).send("No Stripe signature found");
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("⚠️ STRIPE_WEBHOOK_SECRET is not set in environment variables");
    return res.status(500).send("Server configuration error");
  }

  let event: Stripe.Event;

  try {
    // Log the key pieces of information needed for verification (without exposing secrets)
    console.log(`Attempting to verify webhook with signature: ${sig.substring(0, 10)}...`);
    console.log(`Webhook secret configured: ${STRIPE_WEBHOOK_SECRET ? "Yes" : "No"}`);
    console.log(`Payload type: ${typeof payload}`);

    // Verify the event
    event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);

    console.log(`✅ Webhook verified successfully. Event type: ${event.type}`);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    // Return a 400 error right away
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Processing checkout.session.completed for session ${session.id}`);

        const userId = session.metadata?.userId;
        const subscriptionTier = session.metadata?.subscriptionTier;
        const fullPlanName = subscriptionTier ? tierToFullPlanName[subscriptionTier as keyof typeof tierToFullPlanName] : null;
        const customerId = session.customer as string;

        if (userId && subscriptionTier && customerId) {
          console.log(`Updating user ${userId} with subscription tier: ${fullPlanName}`);
          await User.findByIdAndUpdate(userId, {
            stripe_customer_id: customerId,
            subscription_status: "pending",
            subscription_tier: fullPlanName,
          });
          console.log(`User updated successfully`);
        } else {
          console.log(`Missing required metadata: userId: ${!!userId}, tier: ${!!subscriptionTier}, customerId: ${!!customerId}`);
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.log(`Processing invoice.paid for customer ${customerId}`);

        // Find the user by customerId
        const user = await User.findOne({ stripe_customer_id: customerId });

        if (user) {
          const subscriptionEnd = new Date(invoice.lines.data[0]?.period?.end * 1000);
          console.log(`Updating subscription for user ${user._id} until ${subscriptionEnd}`);

          await User.findByIdAndUpdate(user._id, {
            subscription_status: "payment_successful",
            subscription_start: new Date(),
            subscription_end: subscriptionEnd,
          });
          console.log(`Subscription updated successfully`);
        } else {
          console.log(`No user found with customer ID: ${customerId}`);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.log(`Processing invoice.payment_failed for customer ${customerId}`);

        const user = await User.findOne({ stripe_customer_id: customerId });
        if (user) {
          console.log(`Marking subscription as failed for user ${user._id}`);
          await User.findByIdAndUpdate(user._id, {
            subscription_status: "payment_failed",
          });
          console.log(`User subscription status updated to payment_failed`);
        } else {
          console.log(`No user found with customer ID: ${customerId}`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    handleErrors({ res, error });
  }
};

export { getPricingInfo, createCheckoutSession, handleWebhook };
