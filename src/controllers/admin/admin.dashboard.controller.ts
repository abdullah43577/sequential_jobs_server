import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import User from "../../models/users.model";
import Job from "../../models/jobs/jobs.model";
import InterviewMgmt from "../../models/interview/interview.model";
import Test from "../../models/jobs/test.model";
import JobTest from "../../models/assessment/jobtest.model";

const getSummaryStats = async function (req: IUserRequest, res: Response) {
  try {
    const users = await User.find({ role: { $nin: ["admin", "super-admin"] } }).lean();

    const formattedResponse = users.map(user => {
      const name = user.role === "company" ? user.organisation_name : `${user.first_name} ${user.last_name}`;

      return {
        user_id: user._id,
        name,
        email: user.email,
        profile_img: user.profile_pic,
        phone: user.role === "company" ? user.official_phone : user.phone_no,
        user_type: user.role,
        account_status: user.account_status,
        subscription_tier: user.subscription_tier,
        subscription_start: user.subscription_start,
        subscription_end: user.subscription_end,
        createdAt: (user as any).createdAt,
      };
    });

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateAccountStatus = async function (req: IUserRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) return res.status(400).json({ message: "User ID is required!" });
    if (!status || !["active", "deactivated"].includes(status)) return res.status(400).json({ message: "Status is required and must either be 'active' or 'deactivated'" });

    const user = await User.findByIdAndUpdate(id, { account_status: status });

    res.status(200).json({ message: `${user?.first_name}'s account has been disabled successfully!` });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const deleteAccount = async function (req: IUserRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "User ID is required!" });

    await User.findByIdAndDelete(id);
    await Job.deleteMany({ employer: id });
    await InterviewMgmt.deleteMany({ employer: id });
    await Test.deleteMany({ employer: id });
    await JobTest.deleteMany({ employer: id });

    res.status(200).json({ message: "User Account deleted Succesfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getSummaryStats, updateAccountStatus, deleteAccount };

//
