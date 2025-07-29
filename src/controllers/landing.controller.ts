import { Request, Response } from "express";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import User from "../models/users.model";
import { hasAccess } from "../utils/subscriptionConfig";

const getLandingJobs = async function (req: Request, res: Response) {
  try {
    const { countryName, job_title, location, date_posted, pay, job_type, employment_type } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    console.log(countryName, "country name here");

    // Build the base query
    const query: any = { is_live: true };

    // Country filter
    if (countryName && typeof countryName === "string") {
      query.country = new RegExp(`^${countryName}`, "i");
    }

    // Job title filter
    if (job_title && typeof job_title === "string" && job_title.trim()) {
      query.job_title = new RegExp(job_title.trim(), "i");
    }

    // Location filter - search across city, state, and country
    if (location && typeof location === "string" && location.trim()) {
      const locationRegex = new RegExp(location.trim(), "i");
      query.$or = [{ city: locationRegex }, { state: locationRegex }, { country: locationRegex }];
    }

    // Date posted filter
    if (date_posted && typeof date_posted === "string" && date_posted !== "Date Created") {
      const now = new Date();
      let dateFilter;

      switch (date_posted) {
        case "Last 3 hours":
          dateFilter = new Date(now.getTime() - 3 * 60 * 60 * 1000);
          break;
        case "Last 24 hours":
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "Last 3 days":
          dateFilter = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case "Last 7 days":
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "Last months":
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = null;
      }

      if (dateFilter) {
        query.createdAt = { $gte: dateFilter };
      }
    }

    // Pay filter - using the salary field from your model
    if (pay && typeof pay === "string" && pay !== "Pay") {
      if (pay === ">10000") {
        query.salary = { $gt: 10000 };
      } else {
        const [min, max] = pay.split("-").map(Number);
        if (max) {
          query.salary = { $gte: min, $lte: max };
        }
      }
    }

    // Job type filter - convert client values to match DB enum
    if (job_type && typeof job_type === "string" && job_type !== "Job Type") {
      const jobTypeMap: { [key: string]: string } = {
        Hybrid: "hybrid",
        "On Site": "on_site",
        Remote: "remote",
      };
      const dbJobType = jobTypeMap[job_type] || job_type.toLowerCase();
      query.job_type = dbJobType;
    }

    // Employment type filter - convert client values to match DB enum
    if (employment_type && typeof employment_type === "string" && employment_type !== "Employment Type") {
      const employmentTypeMap: { [key: string]: string } = {
        "Full Time": "full_time",
        "Part Time": "part_time",
        Contract: "contract",
      };
      const dbEmploymentType = employmentTypeMap[employment_type] || employment_type.toLowerCase();
      query.employment_type = dbEmploymentType;
    }

    console.log("Final query:", query);

    // Get ALL jobs that match the query (without pagination first)
    const allMatchingJobs = await Job.find(query)
      .populate<{ employer: { _id: string; organisation_name: string; profile_pic: string; subscription_tier: string } }>("employer", "organisation_name profile_pic subscription_tier")
      .sort({ createdAt: -1 })
      .lean();

    // Filter out freemium jobs
    const nonFreemiumJobs = allMatchingJobs.filter(job => job.employer?.subscription_tier !== "Sequential Freemium");

    // Calculate pagination based on filtered results
    const totalJobs = nonFreemiumJobs.length;
    const totalPages = Math.ceil(totalJobs / limit);
    const skip = (page - 1) * limit;

    // Apply pagination to filtered results
    const jobs = nonFreemiumJobs.slice(skip, skip + limit);

    const responseData = {
      jobs,
      totalJobs,
      totalPages,
      currentPage: page,
    };

    res.status(200).json(responseData);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getLandingJobById = async function (req: Request, res: Response) {
  try {
    const { job_id } = req.query;

    const job = await Job.findById(job_id).populate("employer", "organisation_name");
    if (!job) return res.status(404).json({ message: "Job not found!" });

    res.status(200).json(job);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getCompanyJobs = async function (req: Request, res: Response) {
  try {
    const { username } = req.params;

    if (!username) return res.status(400).json({ message: "Company username is required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "Company Account not found!" });

    // revoke user access if he doesn't have the right to this feature
    if (!hasAccess("jobPostingBroadcast", user.subscription_tier as any)) return res.status(400).json({ message: "Company is on a Free Tier account and does not have the privilege for this!" });

    const { job_title, location, date_posted, pay, job_type, employment_type } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    console.log(`Fetching jobs for company: ${username}`);

    // Build the base query - jobs by this employer only
    const query: any = {
      employer: user._id,
      is_live: true,
    };

    // Job title filter
    if (job_title && typeof job_title === "string" && job_title.trim()) {
      query.job_title = new RegExp(job_title.trim(), "i");
    }

    // Location filter - search across city, state, and country
    if (location && typeof location === "string" && location.trim()) {
      const locationRegex = new RegExp(location.trim(), "i");
      query.$or = [{ city: locationRegex }, { state: locationRegex }, { country: locationRegex }];
    }

    // Date posted filter
    if (date_posted && typeof date_posted === "string" && date_posted !== "Date Created") {
      const now = new Date();
      let dateFilter;

      switch (date_posted) {
        case "Last 3 hours":
          dateFilter = new Date(now.getTime() - 3 * 60 * 60 * 1000);
          break;
        case "Last 24 hours":
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "Last 3 days":
          dateFilter = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case "Last 7 days":
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "Last months":
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = null;
      }

      if (dateFilter) {
        query.createdAt = { $gte: dateFilter };
      }
    }

    // Pay filter - using the salary field from your model
    if (pay && typeof pay === "string" && pay !== "Pay") {
      if (pay === ">10000") {
        query.salary = { $gt: 10000 };
      } else {
        const [min, max] = pay.split("-").map(Number);
        if (max) {
          query.salary = { $gte: min, $lte: max };
        }
      }
    }

    // Job type filter - convert client values to match DB enum
    if (job_type && typeof job_type === "string" && job_type !== "Job Type") {
      const jobTypeMap: { [key: string]: string } = {
        Hybrid: "hybrid",
        "On Site": "on_site",
        Remote: "remote",
      };
      const dbJobType = jobTypeMap[job_type] || job_type.toLowerCase();
      query.job_type = dbJobType;
    }

    // Employment type filter - convert client values to match DB enum
    if (employment_type && typeof employment_type === "string" && employment_type !== "Employment Type") {
      const employmentTypeMap: { [key: string]: string } = {
        "Full Time": "full_time",
        "Part Time": "part_time",
        Contract: "contract",
      };
      const dbEmploymentType = employmentTypeMap[employment_type] || employment_type.toLowerCase();
      query.employment_type = dbEmploymentType;
    }

    console.log("Final company jobs query:", query);

    // Get total job count with filters
    const totalJobs = await Job.countDocuments(query);

    // Get filtered jobs
    const jobs = await Job.find(query).populate("employer", "organisation_name profile_pic").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const responseData = {
      profile_img: user.profile_pic,
      jobs,
      totalJobs,
      totalPages: Math.ceil(totalJobs / limit),
      currentPage: page,
    };

    res.status(200).json(responseData);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getLandingJobs, getLandingJobById, getCompanyJobs };
