type UserTier = "freemium" | "standard" | "pro" | "superPro";

type Feature =
  | "aiCandidateMatching"
  | "15daysResumePoolAccess"
  | "technicalKnowledgeTest"
  | "reportingTools"
  | "applicantTracking"
  | "resumeSearch"
  | "resumeSortingPreQualification"
  | "interviewScheduling"
  | "interviewRatingScaleManagement"
  | "candidateSelectionDashboard"
  | "jobPostingBroadcast"
  | "sequentialGlobalJobDistribution"
  | "assessmentReportManagement"
  | "oneReusableJobSlot"
  | "candidatesOfferAndDocumentation"
  | "access30DaysResumePool"
  | "accessToResumes"
  | "assessmentVendorManagement"
  | "employerBranding"
  | "advancedAnalytics"
  | "premiumJobAdDistribution"
  | "access60DaysResumePool"
  | "unlimitedJobPostings"
  | "prioritySupport"
  | "access90DaysResumePool";

type FeatureAccess = Record<Feature, UserTier[]>;

// Define feature access permissions
const FEATURE_ACCESS: FeatureAccess = {
  aiCandidateMatching: ["freemium", "standard", "pro", "superPro"],
  "15daysResumePoolAccess": ["freemium", "standard", "pro", "superPro"],
  technicalKnowledgeTest: ["freemium", "standard", "pro", "superPro"],
  reportingTools: ["freemium", "standard", "pro", "superPro"],
  applicantTracking: ["freemium", "standard", "pro", "superPro"],
  resumeSearch: ["freemium", "standard", "pro", "superPro"],
  resumeSortingPreQualification: ["freemium", "standard", "pro", "superPro"],
  interviewScheduling: ["standard", "pro", "superPro"],
  interviewRatingScaleManagement: ["standard", "pro", "superPro"],
  candidateSelectionDashboard: ["standard", "pro", "superPro"],
  jobPostingBroadcast: ["standard", "pro", "superPro"],
  sequentialGlobalJobDistribution: ["standard", "pro", "superPro"],
  assessmentReportManagement: ["standard", "pro", "superPro"],
  oneReusableJobSlot: ["standard", "pro", "superPro"],
  candidatesOfferAndDocumentation: ["standard", "pro", "superPro"],
  access30DaysResumePool: ["standard", "pro", "superPro"],
  accessToResumes: ["standard", "pro", "superPro"],
  assessmentVendorManagement: ["standard", "pro", "superPro"],
  employerBranding: ["standard", "pro", "superPro"],
  advancedAnalytics: ["pro", "superPro"],
  premiumJobAdDistribution: ["pro", "superPro"],
  access60DaysResumePool: ["pro", "superPro"],
  unlimitedJobPostings: ["superPro"],
  prioritySupport: ["superPro"],
  access90DaysResumePool: ["superPro"],
} as const;

// Function to check if a user has access to a feature
export const hasAccess = (feature: keyof typeof FEATURE_ACCESS, userTier: UserTier) => FEATURE_ACCESS[feature]?.includes(userTier);

// Define pricing data structure
export interface PricingPlan {
  id: "freemium" | "standard" | "pro" | "superPro";
  name: string;
  tier: UserTier;
  price: number;
  stripePrice: string; // Stripe price ID
  benefits: string[];
  includedFeatures?: string; // Optional field to describe included features from lower tiers
}

// Define base prices for each tier (in dollars)
// These will be used as fallback if the Stripe prices aren't loaded
export const BASE_PRICES = {
  freemium: 0,
  standard: 99,
  pro: 199,
  superPro: 299,
};

// Helper function to get unique benefits for a specific tier
const getUniqueBenefitsForTier = (tier: UserTier): string[] => {
  const benefits: string[] = [];
  const tiers: UserTier[] = ["freemium", "standard", "pro", "superPro"];
  const currentTierIndex = tiers.indexOf(tier);
  const previousTier = currentTierIndex > 0 ? tiers[currentTierIndex - 1] : null;

  // Loop through all features in FEATURE_ACCESS
  for (const [feature, allowedTiers] of Object.entries(FEATURE_ACCESS)) {
    // Check if this feature is available for the current tier
    if (allowedTiers.includes(tier)) {
      // Check if this feature is NOT available in the previous tier (making it unique to this tier)
      if (!previousTier || !allowedTiers.includes(previousTier)) {
        // Convert feature name from camelCase to readable format
        const readableFeature = feature
          .replace(/([A-Z])/g, " $1") // Insert a space before all capital letters
          .replace(/([0-9]+)/g, " $1 ") // Insert spaces around numbers
          .replace(/^./, str => str.toUpperCase()); // Capitalize the first letter

        benefits.push(readableFeature);
      }
    }
  }

  return benefits;
};

// Create base pricing plans with placeholder Stripe price IDs
export const createPricingPlans = (stripePriceIds: Record<string, string> = {}): Record<string, PricingPlan> => {
  return {
    freemium: {
      id: "freemium",
      name: "Freemium",
      tier: "freemium",
      price: BASE_PRICES.freemium,
      stripePrice: stripePriceIds.freemium || "", // No price ID needed for freemium
      benefits: getUniqueBenefitsForTier("freemium"),
    },
    standard: {
      id: "standard",
      name: "Standard",
      tier: "standard",
      price: BASE_PRICES.standard,
      stripePrice: stripePriceIds.standard || "",
      benefits: getUniqueBenefitsForTier("standard"),
      includedFeatures: "All Freemium features plus:",
    },
    pro: {
      id: "pro",
      name: "Professional",
      tier: "pro",
      price: BASE_PRICES.pro,
      stripePrice: stripePriceIds.pro || "",
      benefits: getUniqueBenefitsForTier("pro"),
      includedFeatures: "All Standard features plus:",
    },
    superPro: {
      id: "superPro",
      name: "Super Professional",
      tier: "superPro",
      price: BASE_PRICES.superPro,
      stripePrice: stripePriceIds.superPro || "",
      benefits: getUniqueBenefitsForTier("superPro"),
      includedFeatures: "All Professional features plus:",
    },
  };
};

// Initialize with base pricing plans
export let pricingPlans = createPricingPlans();

// Function to update pricing plans with Stripe price IDs
export const updatePricingPlansWithStripePrices = (stripePriceIds: Record<string, string>) => {
  pricingPlans = createPricingPlans(stripePriceIds);
  // For backward compatibility with code expecting an array
  pricingPlansList = Object.values(pricingPlans);
  return pricingPlans;
};

// For backward compatibility with code expecting an array
export let pricingPlansList: PricingPlan[] = Object.values(pricingPlans);
