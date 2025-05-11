import Stripe from "stripe";
import { updatePricingPlansWithStripePrices } from "./subscriptionConfig";

const { STRIPE_SECRET_KEY } = process.env;

const stripe = new Stripe(STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-04-30.basil",
});

// Track whether Stripe has been initialized
let isStripeInitialized = false;
let stripePriceIds: Record<string, string> = {};

export async function initializeStripeProducts() {
  try {
    console.log("Initializing Stripe products and prices...");

    const productData = [
      {
        tier: "standard",
        name: "Standard Plan",
        description: "Standard tier with essential features",
        price: 1000, // $10
      },
      {
        tier: "pro",
        name: "Professional Plan",
        description: "Professional tier with advanced features",
        price: 1500, // $15
      },
      {
        tier: "superPro",
        name: "Super Professional Plan",
        description: "Super Professional tier with all features",
        price: 16900, // $169
      },
    ];

    const createdPriceIds: Record<string, string> = {};

    for (const data of productData) {
      // Check if product exists
      let product;
      const existingProducts = await stripe.products.list({
        active: true,
      });

      product = existingProducts.data.find(p => p.metadata?.tier === data.tier || p.name === data.name);

      // Create product if it doesn't exist
      if (!product) {
        product = await stripe.products.create({
          name: data.name,
          description: data.description,
          metadata: {
            tier: data.tier,
          },
        });
        console.log(`Created product for tier ${data.tier}: ${product.id}`);
      }

      // Check if price exists for this product
      let price;
      const existingPrices = await stripe.prices.list({
        product: product.id,
        active: true,
      });

      price = existingPrices.data.find(p => p.unit_amount === data.price && p.recurring?.interval === "month");

      // Create price if it doesn't exist
      if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: data.price,
          currency: "usd",
          recurring: {
            interval: "month",
          },
          metadata: {
            tier: data.tier,
          },
        });
        console.log(`Created price for tier ${data.tier}: ${price.id}`);
      }

      createdPriceIds[data.tier] = price.id;
    }

    console.log("Stripe initialization complete");
    console.log("Price IDs:", createdPriceIds);

    // Store price IDs for use in the application
    stripePriceIds = createdPriceIds;

    // Update pricing plans with the real Stripe price IDs
    updatePricingPlansWithStripePrices(stripePriceIds);

    isStripeInitialized = true;

    return stripePriceIds;
  } catch (error) {
    console.error("Error initializing Stripe products:", error);
    throw error;
  }
}

// Function to get Stripe price IDs, initializing if necessary
export async function getStripePriceIds(): Promise<Record<string, string>> {
  if (!isStripeInitialized) {
    await initializeStripeProducts();
  }
  return stripePriceIds;
}
