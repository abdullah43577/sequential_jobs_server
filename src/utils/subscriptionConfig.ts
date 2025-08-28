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

//* new code being implemented upon
export const fullPlanNameToAccess: Record<string, UserTier> = {
  "Sequential Freemium": "freemium",
  "Sequential Standard": "standard",
  "Sequential Professional": "pro",
  "Sequential Super Pro": "superPro",
};

// Updated hasAccess function to handle both formats
export const hasAccess = (feature: keyof typeof FEATURE_ACCESS, userTierOrFullName: string): boolean => {
  // Convert full plan name to tier if needed
  const userTier = fullPlanNameToAccess[userTierOrFullName] || (userTierOrFullName as UserTier);
  return FEATURE_ACCESS[feature]?.includes(userTier);
};

// Helper function to get unique benefits for a specific tier
export const getUniqueBenefitsForTier = (tier: UserTier): string[] => {
  const tiers: UserTier[] = ["freemium", "standard", "pro", "superPro"];
  const benefits: string[] = [];

  const currentTierIndex = tiers.indexOf(tier);
  const previousTier = currentTierIndex > 0 ? tiers[currentTierIndex - 1] : null;

  // If the tier is above freemium, start with a line referencing previous tier
  if (previousTier) {
    const previousPlanName = Object.entries(fullPlanNameToAccess).find(([, value]) => value === previousTier)?.[0];

    if (previousPlanName) {
      benefits.push(`Everything from ${previousPlanName}`);
    }
  }

  // Add only the unique benefits introduced at this tier
  for (const [feature, allowedTiers] of Object.entries(FEATURE_ACCESS)) {
    if (allowedTiers.includes(tier) && (!previousTier || !allowedTiers.includes(previousTier))) {
      const readableFeature = feature
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/([a-zA-Z])(\d)/g, "$1 $2")
        .replace(/(\d)([a-zA-Z])/g, "$1 $2")
        .replace(/\b\w/g, c => c.toUpperCase());

      benefits.push(readableFeature);
    }
  }

  return benefits;
};

// Plan-based location limits // for job creation
export const getMaxLocations = (plan: UserTier) => {
  switch (plan) {
    case "freemium":
      return 1;
    case "standard":
      return 3;
    case "pro":
      return 6;
    default:
      return 10;
  }
};
