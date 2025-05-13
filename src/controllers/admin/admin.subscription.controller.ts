import { Response } from "express";
import { IUserRequest } from "../../interface";
import { handleErrors } from "../../helper/handleErrors";
import User from "../../models/users.model";

const changeUserPlan = async function (req: IUserRequest, res: Response) {
  try {
    //* OP here
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const { plan_name } = req.body;
    if (!plan_name) return res.status(400).json({ message: "Plan name is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

const extendPlanExpiry = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "User ID is required" });

    const { newExpiry }: { userId: string; newExpiry: string } = req.body;
    if (!newExpiry) return res.status(400).json({ message: "new expiry date are required." });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    user.subscription_end = new Date(newExpiry);
    await user.save();

    res.status(200).json({ message: "Subscription Expiry Updated Successfully!" });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { changeUserPlan, extendPlanExpiry };
