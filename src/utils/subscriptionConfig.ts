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

export const hasAccess = (feature: keyof typeof FEATURE_ACCESS, userTier: UserTier) => FEATURE_ACCESS[feature]?.includes(userTier);
