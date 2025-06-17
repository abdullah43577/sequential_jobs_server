import { Request, Response } from "express";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import User from "../models/users.model";

const getLandingJobs = async function (req: Request, res: Response) {
  try {
    // const countryName = getDomainHost(req);
    const { countryName } = req.query;
    console.log(countryName, "country name here");

    const query = countryName ? { country: new RegExp(`^${countryName}$`, "i") } : {};

    const jobs = await Job.find({ ...query, is_live: true })
      .populate("employer", "organisation_name profile_pic")
      .lean()
      .sort({ createdAt: -1 });

    res.status(200).json(jobs);
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

    const jobs = await Job.find({ employer: user._id }).populate("employer", "organisation_name").lean().sort({ createdAt: -1 });

    res.status(200).json({ profile_img: user.profile_pic, data: jobs });
  } catch (error) {
    handleErrors({ res, error });
  }
};
// test
export { getLandingJobs, getLandingJobById, getCompanyJobs };
