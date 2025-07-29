import { Response } from "express";
import { IUserRequest } from "../interface";
import { handleErrors } from "../helper/handleErrors";
import { createTicketSchema, updateTicketSchema } from "../utils/types/ticketValidatorSchema";
import Ticket from "../models/ticket.model";
import User from "../models/users.model";
import { Readable } from "stream";
import cloudinary from "../utils/cloudinaryConfig";
import { queueEmail } from "../workers/globalEmailQueueHandler";
import { JOB_KEY } from "../workers/registerWorkers";

const { CLIENT_URL } = process.env;

const createTicket = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const attachments = req.files as Express.Multer.File[];
    const { type, title, description } = createTicketSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Helper function to upload a single file to Cloudinary
    const uploadFileToCloudinary = (file: Express.Multer.File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `tickets/${userId}/${Date.now()}`,
            resource_type: "auto",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result?.secure_url) {
              resolve(result.secure_url);
            } else {
              reject(new Error("Upload failed - no URL returned"));
            }
          }
        );

        // Create a readable stream from the buffer and pipe it to Cloudinary
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);
        bufferStream.pipe(stream);
      });
    };

    // Upload all attachments to Cloudinary (if any)
    let uploadedAttachments: string[] = [];
    if (attachments && attachments.length > 0) {
      try {
        const uploadPromises = attachments.map(file => uploadFileToCloudinary(file));
        uploadedAttachments = await Promise.all(uploadPromises);
      } catch (uploadError) {
        return res.status(500).json({ message: "File upload failed" });
      }
    }

    // Create ticket with attachment URLs
    const ticket = await Ticket.create({
      createdBy: userId,
      type,
      title,
      description,
      attachments: uploadedAttachments,
    });

    // Send email to candidate of the new ticket created
    await queueEmail(JOB_KEY.CREATE_TICKET, {
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      ticket_title: title,
      ticketId: ticket.ticketId,
      btnUrl: `${CLIENT_URL}/dashboard/company/ticket-management/${ticket._id}`,
    });

    res.status(200).json({
      message: "Ticket Created Successfully!",
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

//* GET TICKET CREATED BY USER
const getUserTicket = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;

    const tickets = await Ticket.find({ createdBy: userId }).lean();

    const formattedResponse = tickets.map(ticket => ({
      ticketId: ticket.ticketId,
      title: ticket.title,
      status: ticket.status,
      type: ticket.type,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const getAllTicket = async function (req: IUserRequest, res: Response) {
  try {
    const tickets = await Ticket.find({}).populate<{ createdBy: { _id: string; first_name: string; last_name: string } }>("createdBy", "first_name last_name").lean();

    //* filter out tickets whose users are still on the platform
    const formattedResponse = tickets
      .filter(ticket => ticket.createdBy?._id)
      .map(ticket => ({
        createdBy: `${ticket.createdBy.first_name} ${ticket.createdBy.last_name}`,
        ticketId: ticket.ticketId,
        title: ticket.title,
        type: ticket.type,
        description: ticket.description,
        status: ticket.status,
        attachments: ticket.attachments,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

    return res.status(200).json(formattedResponse);
  } catch (error) {
    handleErrors({ res, error });
  }
};

const updateTicket = async function (req: IUserRequest, res: Response) {
  try {
    const { userId } = req;
    const { ticketId } = req.query;

    if (!ticketId) return res.status(400).json({ message: "Ticket ID is required" });

    const { status, message } = updateTicketSchema.parse(req.body);

    const ticket = await Ticket.findOne({ ticketId }).populate<{ createdBy: { _id: string; email: string; first_name: string; last_name: string } }>("createdBy", "email first_name last_name");
    if (!ticket) return res.status(404).json({ message: "Ticket not found!" });

    ticket.status = status;

    if (message && message.trim().length > 0) {
      ticket.comments.push({ sender: userId as string, message });
    }
    await ticket.save();

    await queueEmail(JOB_KEY.UPDATE_TICKET, {
      email: ticket.createdBy.email,
      first_name: ticket.createdBy.first_name,
      last_name: ticket.createdBy.last_name,
      ticket_title: ticket.title,
      ticketId: ticket.ticketId,
      status,
      message,
      btnUrl: `${CLIENT_URL}/dashboard/company/ticket-management/${ticket._id}`,
    });

    res.status(200).json({ message: `Ticket ${ticketId} updated successfully!` });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { createTicket, getUserTicket, getAllTicket, updateTicket };
