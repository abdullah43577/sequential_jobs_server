import Stripe from "stripe";
const { STRIPE_SECRET_KEY, NODE_ENV } = process.env;

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

export const initializeWebhookEndpoint = async function () {
  // Determine the base URL based on environment
  //   const baseUrl = NODE_ENV === "production" ? "https://sequential-jobs-server.onrender.com" : "http://localhost:8080";
  const baseUrl = "https://sequential-jobs-server.onrender.com";

  const webhookEndpoint = await stripe.webhookEndpoints.create({
    enabled_events: ["charge.succeeded", "charge.failed"],
    url: `${baseUrl}/api/employer/payment/webhook`,
  });

  console.log("webhook endpoint initiated");
};
