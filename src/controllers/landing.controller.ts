import { Request, Response } from "express";
import { handleErrors } from "../helper/handleErrors";
import Job from "../models/jobs/jobs.model";
import { getDomainHost } from "../utils/getHostName";

const getLandingJobs = async function (req: Request, res: Response) {
  try {
    const countryName = getDomainHost(req);

    const query = countryName ? { country: new RegExp(`^${countryName}$`, "i") } : {};

    const jobs = await Job.find(query).populate("employer", "organisation_name").sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getCompanyJobs = async function (req: Request, res: Response) {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ message: "Company username is required" });

    const jobs = await Job.find({ username }).populate("employer", "organisation_name").sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getLandingJobs, getCompanyJobs };
