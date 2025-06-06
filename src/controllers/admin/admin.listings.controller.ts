import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import Job from "../../models/jobs/jobs.model";

const getListings = async function (req: IUserRequest, res: Response) {
  try {
    const jobs = await Job.find({ is_live: true }).populate<{ employer: { _id: string; organisation_name: string } }>("employer", "organisation_name").lean();

    const formattedResponse = jobs.map(job => ({
      job_id: job._id,
      position: job.job_title,
      name: job.employer.organisation_name,
      employment_type: job.employment_type,
      job_type: job.job_type,
      date_posted: (job as any).createdAt,
      no_of_applicants: job.applicants.length,
      city: job.city,
      state: job.state,
      country: job.country,
      status: job.status,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateListingStatus = async function (req: IUserRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) return res.status(404).json({ message: "Job ID is required!" });

    if (!status || (status.toLowerCase() !== "archived" && status.toLowerCase() !== "flagged")) return res.status(400).json({ message: "Job Status is required " });

    await Job.findByIdAndUpdate(id, { status, is_live: false });

    res.status(200).json({ message: "Listing Updated Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const deleteListing = async function (req: IUserRequest, res: Response) {
  try {
    const { id } = req.params;

    if (!id) return res.status(404).json({ message: "Job ID is required!" });

    await Job.findByIdAndDelete(id);

    res.status(200).json({ message: "Job Deleted Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getListings, updateListingStatus, deleteListing };
