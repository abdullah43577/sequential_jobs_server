import { Request, Response } from "express";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import User from "../models/users.model";

const getLandingJobs = async function (req: Request, res: Response) {
  try {
    const { countryName } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    console.log(countryName, "country name here");

    const query = countryName ? { country: new RegExp(`^${countryName}$`, "i") } : {};
    const baseQuery = { ...query, is_live: true };

    // Get total job count
    const totalJobs = await Job.countDocuments(baseQuery);

    const jobs = await Job.find(baseQuery).populate("employer", "organisation_name profile_pic").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    const responseData = {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const baseQuery = { employer: user._id };

    const totalJobs = await Job.countDocuments(baseQuery);

    const jobs = await Job.find(baseQuery).populate("employer", "organisation_name profile_pic").sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

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

//
