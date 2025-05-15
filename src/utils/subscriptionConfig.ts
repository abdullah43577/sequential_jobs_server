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

// Map from full plan name to tier identifier
export const fullPlanNameToTier: Record<string, UserTier> = {
  "Sequential Freemium": "freemium",
  "Sequential Standard": "standard",
  "Sequential Pro": "pro",
  "Sequential Super Pro": "superPro",
};

// Updated hasAccess function to handle both formats
export const hasAccess = (feature: keyof typeof FEATURE_ACCESS, userTierOrFullName: string): boolean => {
  // Convert full plan name to tier if needed
  const userTier = fullPlanNameToTier[userTierOrFullName] || (userTierOrFullName as UserTier);
  return FEATURE_ACCESS[feature]?.includes(userTier);
};

// Define pricing data structure
export interface PricingPlan {
  id: "freemium" | "standard" | "pro" | "superPro";
  name: string;
  tier: UserTier;
  price: number;
  stripePrice: string;
  benefits: string[];
  includedFeatures?: string;
}

// Define base prices for each tier (in dollars)
export const BASE_PRICES = {
  freemium: 0,
  standard: 10,
  pro: 15,
  superPro: 169,
};

// Helper function to get unique benefits for a specific tier
const getUniqueBenefitsForTier = (tier: UserTier): string[] => {
  const benefits: string[] = [];
  const tiers: UserTier[] = ["freemium", "standard", "pro", "superPro"];
  const currentTierIndex = tiers.indexOf(tier);
  const previousTier = currentTierIndex > 0 ? tiers[currentTierIndex - 1] : null;

  for (const [feature, allowedTiers] of Object.entries(FEATURE_ACCESS)) {
    if (allowedTiers.includes(tier)) {
      if (!previousTier || !allowedTiers.includes(previousTier)) {
        const readableFeature = feature
          .replace(/([A-Z])/g, " $1")
          .replace(/([0-9]+)/g, " $1 ")
          .replace(/^./, str => str.toUpperCase());

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

// Define mapping from tier identifiers to full plan names
export const tierToFullPlanName: Record<string, string> = {
  freemium: "Sequential Freemium",
  standard: "Sequential Standard",
  pro: "Sequential Pro",
  superPro: "Sequential Super Pro",
};

// Use this function when you need to convert a tier ID to a full plan name
export const getFullPlanName = (tier: string): string => {
  return tierToFullPlanName[tier] || tier;
};
