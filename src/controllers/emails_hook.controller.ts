import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";

interface HookResponse {
  type: "email.failed" | "email.delivery_delayed" | "email.delivered";
  created_at: string;
  data: {
    broadcast_id: string;
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    tags: {
      name: string;
      value: string;
    }[];
  };
}

const EmailActivityHookEvent = function (req: IUserRequest, res: Response) {
  try {
    const data = req.body as HookResponse;

    switch (data.type) {
      case "email.failed":
        console.log(`Email sent to ${data.data.to.toString()} failed.......`);
        console.log(data);
        break;

      case "email.delivery_delayed":
        console.log(`Email sent to ${data.data.to.toString()} has been delayed till further notice....`);
        console.log(data);
        break;

      default:
        console.log("last case event");
        console.log(data);
        break;
    }

    res.status(200);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { EmailActivityHookEvent };
