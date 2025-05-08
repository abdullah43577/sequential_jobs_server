import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import User from "../../models/users.model";

const getSummaryStats = async function (req: IUserRequest, res: Response) {
  try {
    const users = await User.find({ role: { $nin: ["admin", "super-admin"] } }).lean();

    const formattedResponse = users.map(user => ({
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.role === "company" ? user.official_phone : user.phone_no,
      user_type: user.role,
      active_status: false,
      subscription_tier: user.subscription_tier,
      subscription_start: user.subscription_start,
      subscription_end: user.subscription_end,
      createdAt: (user as any).createdAt,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getSubscriptionInfo = async function (req: IUserRequest, res: Response) {
  try {
    //* OP here
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getSummaryStats, getSubscriptionInfo };
