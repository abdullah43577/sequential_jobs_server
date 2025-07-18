import { Request, Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import { fullPlanNameToAccess, getUniqueBenefitsForTier } from "../../utils/subscriptionConfig";
import Stripe from "stripe";
import User from "../../models/users.model";
import { stripe } from "../../server";
const { STRIPE_WEBHOOK_SECRET, SEQUENTIAL_FREEMIUM, SEQUENTIAL_STANDARD, SEQUENTIAL_PRO, SEQUENTIAL_SUPER_PRO } = process.env;

const getPricingInfo = async function (req: IUserRequest, res: Response) {
  try {
    const { country } = req.query;

    //* product IDs
    const productIds = [SEQUENTIAL_FREEMIUM, SEQUENTIAL_STANDARD, SEQUENTIAL_PRO, SEQUENTIAL_SUPER_PRO];

    //* retrieve all pricing plans
    const products = await Promise.all(productIds.map(id => stripe.products.retrieve(id as string)));

    const result = await Promise.all(
      products.map(async product => {
        const prices = await stripe.prices.list({ product: product.id, active: true });
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          prices: prices.data.map(price => ({
            id: price.id,
            currency: price.currency,
            unit_amount: price.unit_amount,
            nickname: price.nickname,
          })),
        };
      })
    );

    const formattedPricing = result
      .map(data => {
        const tier = fullPlanNameToAccess[data.name as keyof typeof fullPlanNameToAccess];
        const uniqueBenefits = getUniqueBenefitsForTier(tier);

        const filteredPrices = data.prices.filter(price => (country === "ngn" ? price.currency === "ngn" : price.currency === "usd"));

        return {
          ...data,
          prices: filteredPrices,
          features: uniqueBenefits,
        };
      })
      .filter(plan => plan.prices.length > 0);

    res.status(200).json(formattedPricing);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const createCheckoutSession = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { subscription_tier_name, priceId } = req.body;

    if (!subscription_tier_name || !priceId)
      return res.status(400).json({
        message: "Subscription tier name and price ID is required!",
      });

    const user = await User.findById(userId).select("email").lean();

    if (!user) return res.status(404).json({ message: "user not found!" });

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
      success_url: `${process.env.CLIENT_URL}/dashboard/company/features&pricing/thank-you`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/company/features&pricing/error`,
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

const handleWebhook = async function (req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    console.warn("[Webhook] Missing Stripe signature.");
    return res.status(400).json({ message: "No Stripe signature found" });
  }

  let event: Stripe.Event;

  try {
    // Verify and construct the event
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET as string);
    console.log(`[Webhook] Received event: ${event.type}`);
  } catch (err: any) {
    console.error(`[Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        const userId = session.metadata?.userId;
        const planName = session.metadata?.planName as "Sequential Freemium" | "Sequential Standard" | "Sequential Professional" | "Sequential Super Pro";
        const fullPlanName = planName === "Sequential Professional" ? "Sequential Pro" : planName;
        const customerId = session.customer as string;

        console.log(`[Webhook][checkout.session.completed] userId: ${userId}, planName: ${planName}, customerId: ${customerId}`);

        if (userId && planName && customerId) {
          await User.findByIdAndUpdate(userId, {
            stripe_customer_id: customerId,
            subscription_status: "pending",
            subscription_tier: fullPlanName,
          });

          console.log(`[Webhook][checkout.session.completed] Updated user ${userId} successfully.`);
        } else {
          console.log(`Missing required metadata: userId: ${!!userId}, tier: ${!!planName}, customerId: ${!!customerId}`);
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const user = await User.findOne({ stripe_customer_id: customerId });

        console.log(`[Webhook][invoice.paid] Received payment for customerId: ${customerId}`);

        if (user) {
          const subscriptionEnd = new Date(invoice.lines.data[0]?.period?.end * 1000);

          await User.findByIdAndUpdate(user._id, {
            subscription_status: "payment_successful",
            subscription_start: new Date(),
            subscription_end: subscriptionEnd,
          });
          console.log(`[Webhook][invoice.paid] Updated user ${user._id} with successful payment.`);
        } else {
          console.log(`No user found with customer ID: ${customerId}`);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        const user = await User.findOne({ stripe_customer_id: customerId });

        console.log(`[Webhook][invoice.payment_failed] Payment failed for customerId: ${customerId}`);

        if (user) {
          await User.findByIdAndUpdate(user._id, {
            subscription_status: "payment_failed",
          });
          console.log(`[Webhook][invoice.payment_failed] Marked user ${user._id} as payment_failed.`);
        } else {
          console.log(`No user found with customer ID: ${customerId}`);
        }

        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    handleErrors({ res, error });
  }
};

export { getPricingInfo, createCheckoutSession, handleWebhook };
