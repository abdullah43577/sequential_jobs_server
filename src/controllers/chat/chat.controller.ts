import { Response } from "express";
import { IUserRequest } from "../../interface";
import User from "../../models/users.model";
import { Room } from "../../models/broadcasts/room.model";
import { getSocketIO } from "../../helper/socket";
import { handleErrors } from "../../helper/handleErrors";
import { Message } from "../../models/broadcasts/message.model";
import { Types } from "mongoose";

// Create a private chat between admin and a user
const createPrivateChat = async (req: IUserRequest, res: Response) => {
  try {
    const { userId: adminId } = req;
    const { userId } = req.body;

    // Validate target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        message: "Target user not found",
      });
    }

    // Create unique room name
    const participants: string[] = [adminId, userId].sort();
    const roomName = participants.join("_");

    // Check if room already exists
    let room = await Room.findOne({ name: roomName });

    if (!room) {
      room = await Room.create({
        name: roomName,
        type: "private",
        participants,
        admin: adminId,
      });
    }

    // Get io instance and emit to both users they've been added to a room
    const io = getSocketIO();

    // Notify both participants about the new or existing room
    for (const participantId of participants) {
      io.to(participantId).emit("room_added", {
        roomId: room._id,
        participants: room.participants,
        type: "private",
      });
    }

    // Return the room
    const populatedRoom = await Room.findById(room._id)
      .populate<{ participants: { _id: string; first_name: string; last_name: string; email: string; role: string }[] }>("participants", "first_name last_name email role")
      .populate<{ admin: { _id: string; first_name: string; last_name: string; email: string; role: string } }>("admin", "first_name last_name email role");

    return res.status(201).json(populatedRoom);
  } catch (error) {
    handleErrors({ res, error });
  }
};

// Get all rooms where the user is a participant
const getUserRooms = async (req: IUserRequest, res: Response) => {
  try {
    const { userId } = req;

    const rooms = await Room.find({ participants: userId }).populate("participants", "first_name last_name email role").populate("admin", "first_name last_name email role").sort({ updatedAt: -1 }).lean();

    // For each room, get the last message
    const roomsWithLastMessage = await Promise.all(
      rooms.map(async room => {
        const lastMessage = await Message.findOne({ room: room._id }).sort({ createdAt: -1 }).populate("sender", "first_name last_name email role").lean();

        // Count unread messages
        const unreadCount = await Message.countDocuments({
          room: room._id,
          sender: { $ne: userId },
          "readBy.user": { $ne: userId },
        });

        return {
          ...room,
          lastMessage,
          unreadCount,
        };
      })
    );

    return res.status(200).json(roomsWithLastMessage);
  } catch (error) {
    handleErrors({ res, error });
  }
};

// Get chat history for a specific room
const getChatHistory = async (req: IUserRequest, res: Response) => {
  try {
    const { userId } = req;
    const { roomId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    // Validate room exists and user is a participant
    const room = await Room.findById(roomId).lean();
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (!room.participants.includes(userId as unknown as Types.ObjectId))
      return res.status(403).json({
        message: "You are not authorized to access this room",
      });

    // Calculate skip value for pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get messages with pagination
    const messages = await Message.find({ room: roomId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate("sender", "name email role")
      .lean();

    // Mark messages as read
    await Message.updateMany(
      {
        room: roomId,
        sender: { $ne: userId },
        "readBy.user": { $ne: userId },
      },
      {
        $push: { readBy: { user: userId, readAt: new Date() } },
      }
    );

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({ room: roomId });

    return res.status(200).json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        total: totalMessages,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(totalMessages / parseInt(limit as string)),
      },
    });
  } catch (error) {
    handleErrors({ res, error });
  }
};

export { createPrivateChat, getUserRooms, getChatHistory };
