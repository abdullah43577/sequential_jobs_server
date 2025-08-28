import mongoose from "mongoose";
import Job from "../models/jobs/jobs.model";
import Test from "../models/jobs/test.model";
import { EXPERIENCE_LEVELS, JOB_CATEGORIES } from "./jobsHelper";

export interface JobData {
  JobID: string;
  Title: string;
  JobCategory: string;
  RequiredExperienceLevel: string;
  Locations: { country: string; state: string; city: string }[];
  JobType: string;
  EmploymentType: string;
  Salary: number;
  CurrencyType: string;
  PaymentFrequency: string;
  YearsOfExperience: number;
  GenericSkills: string;
  TechnicalSkills: string;
  JobDescription: string;
}

export interface TestQuestionData {
  JobID: string;
  Question: string;
  QuestionType: "multiple_choice" | "yes/no" | "text";
  Score: number;
  Options: string;
  CorrectAnswer: string;
}

export interface TestCutoffData {
  JobID: string;
  NotSuitableMin: number;
  NotSuitableMax: number;
  ProbableMin: number;
  ProbableMax: number;
  SuitableMin: number;
  SuitableMax: number;
}

/**
 * Process the uploaded data by validating and saving to database
 */
export async function processUploadData(jobsData: JobData[], testQuestionsData: TestQuestionData[], testCutoffsData: TestCutoffData[], userId: string) {
  const session = await mongoose.startSession();
  session.startTransaction();

  const result = {
    jobsCreated: 0,
    testsCreated: 0,
    errors: [] as string[],
  };

  const jobMap = new Map<string, mongoose.Types.ObjectId>();

  try {
    // Process jobs
    for (const jobData of jobsData) {
      try {
        const formattedJob = formatJobData(jobData, userId);
        const job = new Job(formattedJob);
        await job.save({ session });

        // Store the mapping of JobID to the actual MongoDB _id
        jobMap.set(jobData.JobID, job._id);
        result.jobsCreated++;
      } catch (error: any) {
        result.errors.push(`Error with job ${jobData.JobID}: ${error.message}`);
      }
    }

    // Group questions by JobID
    const questionsByJob = new Map<string, any[]>();
    for (const question of testQuestionsData) {
      if (!questionsByJob.has(question.JobID)) {
        questionsByJob.set(question.JobID, []);
      }
      const formattedQuestion = formatQuestionData(question);
      questionsByJob.get(question.JobID)!.push(formattedQuestion);
    }

    // Process tests with their questions
    for (const [jobId, questions] of questionsByJob.entries()) {
      const mongoJobId = jobMap.get(jobId);
      if (!mongoJobId) {
        result.errors.push(`Cannot create test for job ${jobId}: Job not found`);
        continue;
      }

      // Find cutoff data for this job
      const cutoff = testCutoffsData.find(c => c.JobID === jobId);
      if (!cutoff) {
        result.errors.push(`No cutoff data found for job ${jobId}`);
        continue;
      }

      try {
        const testData = {
          job: mongoJobId,
          employer: userId,
          instruction: `Application test for job ${jobId}`,
          questions: questions,
          type: "application_test",
          cut_off_points: formatCutoffData(cutoff),
        };

        const test = new Test(testData);
        await test.save({ session });

        // Update the job with the test reference
        await Job.findByIdAndUpdate(mongoJobId, { application_test: test._id, is_live: true }, { session });

        result.testsCreated++;
      } catch (error: any) {
        result.errors.push(`Error creating test for job ${jobId}: ${error.message}`);
      }
    }

    await session.commitTransaction();
    return result;
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Format job data from Excel to match the Job schema
 */
function formatJobData(jobData: JobData, userId: string) {
  const jobTypeMap: Record<string, string> = {
    Remote: "remote",
    "On-site": "on_site",
    Hybrid: "hybrid",
  };

  const employmentTypeMap: Record<string, string> = {
    "Full-time": "full_time",
    "Part-time": "part_time",
    Contract: "contract",
  };

  const paymentFrequencyMap: Record<string, string> = {
    Monthly: "monthly",
    Yearly: "yearly",
    Weekly: "weekly",
  };

  // Validate job category
  const jobCategory = jobData.JobCategory?.toLowerCase().replace(/\s+/g, "-");
  if (!JOB_CATEGORIES.includes(jobCategory)) {
    throw new Error(`Invalid job category: ${jobData.JobCategory}. Must be one of: ${JOB_CATEGORIES.join(", ")}`);
  }

  // Validate required experience level
  const experienceLevel = jobData.RequiredExperienceLevel?.toLowerCase();
  if (!EXPERIENCE_LEVELS.includes(experienceLevel)) {
    throw new Error(`Invalid experience level: ${jobData.RequiredExperienceLevel}. Must be one of: ${EXPERIENCE_LEVELS.join(", ")}`);
  }

  return {
    employer: userId,
    job_title: jobData.Title,
    job_category: jobCategory,
    required_experience_level: experienceLevel,
    locations: jobData.Locations || [],
    job_type: jobTypeMap[jobData.JobType] || jobData.JobType.toLowerCase(),
    employment_type: employmentTypeMap[jobData.EmploymentType] || jobData.EmploymentType.toLowerCase(),
    salary: Number(jobData.Salary),
    currency_type: jobData.CurrencyType || "USD",
    payment_frequency: paymentFrequencyMap[jobData.PaymentFrequency] || jobData.PaymentFrequency.toLowerCase(),
    generic_skills: jobData.GenericSkills ? jobData.GenericSkills.split(",").map(s => s.trim()) : [],
    technical_skills: jobData.TechnicalSkills ? jobData.TechnicalSkills.split(",").map(s => s.trim()) : [],
    description: jobData.JobDescription,
    is_live: false,
    stage: "job_post_creation",
    status: "active",
    applicants: [],
  };
}

/**
 * Format question data from Excel to match the Test schema
 */
function formatQuestionData(questionData: TestQuestionData) {
  const options = questionData.QuestionType === "text" ? [] : parseOptions(questionData.Options);

  return {
    question: questionData.Question,
    question_type: questionData.QuestionType,
    score: Number(questionData.Score),
    options: options,
    correct_answer: questionData.CorrectAnswer || null,
  };
}

/**
 * Parse options string from Excel
 * Format expected: "A:Option1, B:Option2, C:Option3, D:Option4"
 */
function parseOptions(optionsStr: string): string[] {
  if (!optionsStr) return [];

  return optionsStr
    .split(",")
    .map(opt => opt.trim())
    .map(opt => {
      // Extract just the text after the prefix (e.g., "A:")
      const match = opt.match(/^[A-Z]:(.*)/);
      return match ? match[1].trim() : opt;
    });
}

/**
 * Format cutoff data from Excel to match the Test schema
 */
function formatCutoffData(cutoffData: TestCutoffData) {
  return {
    not_suitable: {
      min: Number(cutoffData.NotSuitableMin),
      max: Number(cutoffData.NotSuitableMax),
    },
    probable: {
      min: Number(cutoffData.ProbableMin),
      max: Number(cutoffData.ProbableMax),
    },
    suitable: {
      min: Number(cutoffData.SuitableMin),
      max: Number(cutoffData.SuitableMax),
    },
  };
}
