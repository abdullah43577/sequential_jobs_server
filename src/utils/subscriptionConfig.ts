// subscriptionConfig.ts

// Define unique features for each tier (non-cumulative)
const subscriptionFeatures = {
  "Sequential Freemium": ["AI-powered candidate matching", "Access to resume pool", "Job Technical Knowledge based Test", "Reporting tools", "Applicant tracking", "Resume search", "Resume Sorting & Pre-Qualification", "Job posting and setup"],
  "Sequential Standard": [
    "Interview scheduling and management",
    "Interview rating scale set up and management",
    "Candidate selection-Rating Outcomes Dashboard",
    "Job posting broadcast",
    "Sequential global-Job Distribution",
    "Assessment report management",
    "One reusable job slot",
    "Candidates offer and documentation management",
    "30 days Access to resume pool", // Overrides the basic access
    "Allocation of assessment vendor management",
    "Employer branding",
  ],
  "Sequential Pro": [
    "Advanced analytics",
    "Plus, premium job ad distribution",
    "60 days Access to resume pool", // Overrides the 30 days access
  ],
  "Sequential Super Pro": [
    "Unlimited job postings",
    "Priority support",
    "90 days Access to resume pool", // Overrides the 60 days access
  ],
};

type SubscriptionTier = keyof typeof subscriptionFeatures;

// Helper function to get all features available for a subscription tier
const getFeaturesForTier = function (tier: SubscriptionTier): string[] {
  const tiers: SubscriptionTier[] = ["Sequential Freemium", "Sequential Standard", "Sequential Pro", "Sequential Super Pro"];
  const tierIndex = tiers.indexOf(tier);

  if (tierIndex === -1) return [];

  // Feature tracking with overrides handling
  const featureMap = new Map<string, string>();
  const baseFeatureNames = new Set<string>();

  // Process features from lowest tier up to the requested tier
  for (let i = 0; i <= tierIndex; i++) {
    const currentTier = tiers[i];
    const currentFeatures = subscriptionFeatures[currentTier];

    currentFeatures.forEach(feature => {
      // Handle special case for "Access to resume pool" with days specification
      if (feature.includes("days Access to resume pool")) {
        // Remove any previous "Access to resume pool" entries
        baseFeatureNames.delete("Access to resume pool");
        featureMap.set("Access to resume pool", feature);
      }
      // Handle special case for "job postings"
      else if (feature.includes("job postings") || feature === "One reusable job slot") {
        // Find and remove any previous job posting related features
        for (const key of featureMap.keys()) {
          if (key.includes("job slot") || key.includes("job postings")) {
            featureMap.delete(key);
          }
        }
        featureMap.set(feature, feature);
      }
      // Regular feature
      else {
        featureMap.set(feature, feature);
        baseFeatureNames.add(feature);
      }
    });
  }

  return Array.from(featureMap.values());
};

// Subscription pricing
const subscriptionPricing = {
  "Sequential Freemium": 0,
  "Sequential Standard": 9.99,
  "Sequential Pro": 19.99,
  "Sequential Super Pro": 39.99,
};

const hasAccess = function (userTier: SubscriptionTier, featureName: string): boolean {
  const userFeatures = getFeaturesForTier(userTier);

  // Direct match
  if (userFeatures.includes(featureName)) {
    return true;
  }

  // Handle special cases like "X days Access to resume pool"
  if (featureName === "Access to resume pool") {
    return userFeatures.some(f => f.includes("Access to resume pool"));
  }

  // Handle job posting related features
  if (featureName.includes("job posting") || featureName.includes("job slot")) {
    if (userTier === "Sequential Super Pro") {
      return true; // Super Pro has unlimited job postings
    }
    return userFeatures.some(f => f.includes("job slot") || f.includes("job postings"));
  }

  return false;
};

export { subscriptionFeatures, getFeaturesForTier, subscriptionPricing, hasAccess, type SubscriptionTier };
