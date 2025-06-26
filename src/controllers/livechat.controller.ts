import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import Conversation from "../models/live-chat/conversations";
import Message from "../models/live-chat/message";

const getChatRooms = async function (req: IUserRequest, res: Response) {
  try {
    const conversations = await Conversation.find({})
      .populate<{ participants: { _id: string; first_name: string; last_name: string; role: string }[] }>("participants", "first_name last_name role")
      .populate<{ initiatedBy: { _id: string; first_name: string; last_name: string; role: string } }>("initiatedBy", "first_name last_name role")
      .lean();

    const formattedResponse = await Promise.all(
      conversations.map(async convo => {
        const messages = await Message.find({ conversation: convo._id }).lean();
        return {
          ...convo,
          messages,
        };
      })
    );

    return res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { getChatRooms };
