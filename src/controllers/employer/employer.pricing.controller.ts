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
      success_url: `${process.env.FRONTEND_URL}/dashboard/company/features&pricing/thank-you`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/company/features&pricing/error`,
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
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET as string);
  } catch (err: any) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId;
        const subscriptionTier = session.metadata?.subscriptionTier;
        const fullPlanName = subscriptionTier ? tierToFullPlanName[subscriptionTier] : null;
        const customerId = session.customer as string;

        if (userId && subscriptionTier && customerId) {
          await User.findByIdAndUpdate(userId, {
            stripe_customer_id: customerId,
            subscription_status: "pending",
            subscription_tier: fullPlanName,
          });
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Find the user by customerId
        const user = await User.findOne({ stripe_customer_id: customerId });

        if (user) {
          await User.findByIdAndUpdate(user._id, {
            subscription_status: "payment_successful",
            subscription_start: new Date(),
            subscription_end: new Date(invoice.lines.data[0].period.end * 1000),
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const user = await User.findOne({ stripe_customer_id: customerId });
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            subscription_status: "payment_failed",
          });
        }

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getPricingInfo, createCheckoutSession, handleWebhook };
