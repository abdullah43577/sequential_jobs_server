export const JOB_CATEGORIES = [
  "software-development",
  "data-science",
  "design-creative",
  "marketing-sales",
  "finance-accounting",
  "human-resources",
  "operations-management",
  "customer-service",
  "healthcare-medical",
  "education-training",
  "legal",
  "engineering",
  "consulting",
  "research",
  "project-management",
  "business-analysis",
  "quality-assurance",
  "cybersecurity",
  "writing-content",
  "administration",
];

export const EXPERIENCE_LEVELS = [
  "entry", // 0-2 years
  "mid", // 2-5 years
  "senior", // 5+ years
  "lead", // 7+ years with leadership
  "executive", // C-level, VP, Director
];

// Helper function to map years of experience to level
export const mapExperienceYearsToLevel = (years: number) => {
  if (years <= 2) return "entry";
  if (years <= 5) return "mid";
  if (years <= 7) return "senior";
  if (years <= 10) return "lead";
  return "executive";
};

// Helper function to get compatible experience levels for job matching
export const getCompatibleExperienceLevels = (jobRequiredLevel: string) => {
  const levels = ["entry", "mid", "senior", "lead", "executive"];
  const jobIndex = levels.indexOf(jobRequiredLevel);

  // For entry level jobs, only entry level candidates
  if (jobRequiredLevel === "entry") return ["entry"];

  // For other levels, include current level and below (overqualified candidates)
  return levels.slice(0, jobIndex + 1);
};

type SubscriptionTiers = "Sequential Freemium" | "Sequential Standard" | "Sequential Pro" | "Sequential Super Pro";

const getUserJobPostMaxCountPerSubscriptionLevel = (tier: SubscriptionTiers): number | string => {
  switch (tier) {
    case "Sequential Freemium":
      return 5;

    case "Sequential Standard":
      return 20;

    case "Sequential Pro":
      return 50;

    case "Sequential Super Pro":
      return "unlimited";

    default:
      return 0;
  }
};

export const getEffectiveJobSlotCount = ({ currentTier, lastTier, lastSubscriptionEnd }: { currentTier: SubscriptionTiers; lastTier: SubscriptionTiers | null; lastSubscriptionEnd: Date | null }): number | "unlimited" => {
  const baseLimit = getUserJobPostMaxCountPerSubscriptionLevel(currentTier);

  if (baseLimit === "unlimited") return "unlimited";

  let rolloverBonus = 0;

  // Allow 1-month grace for rollover slot
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const wasDowngradedRecently = lastTier && lastTier !== currentTier && lastSubscriptionEnd && new Date(lastSubscriptionEnd) >= lastMonthStart;

  if (wasDowngradedRecently) {
    switch (lastTier) {
      case "Sequential Standard":
        rolloverBonus = 1;
        break;
      case "Sequential Pro":
        rolloverBonus = 2;
        break;
      case "Sequential Super Pro":
        rolloverBonus = 3;
        break;
      default:
        rolloverBonus = 0;
    }
  }

  return (baseLimit as number) + rolloverBonus;
};
