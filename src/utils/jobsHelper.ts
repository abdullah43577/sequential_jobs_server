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

export const recalculateCutoffPoints = (oldCutoff: any, oldTotal: number, newTotal: number) => {
  if (oldTotal === newTotal) return oldCutoff;

  const ratio = newTotal / oldTotal;

  // Proportional scaling
  let newCutoff = {
    not_suitable: {
      min: 0,
      max: Math.floor(oldCutoff.not_suitable.max * ratio),
    },
    probable: {
      min: Math.floor(oldCutoff.not_suitable.max * ratio) + 1,
      max: Math.floor(oldCutoff.probable.max * ratio),
    },
    suitable: {
      min: Math.floor(oldCutoff.probable.max * ratio) + 1,
      max: newTotal,
    },
  };

  // Validate ranges don't overlap
  if (newCutoff.probable.min <= newCutoff.not_suitable.max || newCutoff.suitable.min <= newCutoff.probable.max) {
    // Fallback to equal distribution
    const third = Math.floor(newTotal / 3);
    newCutoff = {
      not_suitable: { min: 0, max: third },
      probable: { min: third + 1, max: third * 2 },
      suitable: { min: third * 2 + 1, max: newTotal },
    };
  }

  return newCutoff;
};
