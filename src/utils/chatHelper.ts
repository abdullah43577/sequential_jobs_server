// import { Types } from "mongoose";
// import { Room } from "../models/broadcasts/room.model";
// import { getSocketIO } from "../helper/socket";
// import { Message } from "../models/broadcasts/message.model";
// import { Broadcast } from "../models/broadcasts/broadcast.model";
// import User from "../models/users.model";

// // Helper function to create a room name based on participants
// const createRoomName = (participants: Types.ObjectId[]) => {
//   return participants.sort().join("_");
// };

// // Create or get a room for private chat
// export const createOrGetPrivateRoom = async (adminId: Types.ObjectId, userId: Types.ObjectId) => {
//   // For private chats, create a unique room name using both IDs
//   const participants = [adminId, userId];
//   const roomName = createRoomName(participants);

//   // Check if room already exists
//   let room = await Room.findOne({ name: roomName });

//   if (!room) {
//     // Create new room
//     room = await Room.create({
//       name: roomName,
//       type: "private",
//       participants,
//       admin: adminId,
//     });
//   }

//   return room;
// };

// // Create a broadcast room for multiple users
// export const createBroadcastRoom = async (adminId: Types.ObjectId, userIds: (Types.ObjectId | string)[]) => {
//   // Generate a unique room name for broadcast
//   const roomName = `broadcast_${adminId}_${Date.now()}`;

//   // Create a new broadcast room
//   const room = await Room.create({
//     name: roomName,
//     type: "broadcast",
//     participants: [adminId, ...userIds],
//     admin: adminId,
//   });

//   return room;
// };

// // Send a message to a specific room
// export const sendMessageToRoom = async (roomId: Types.ObjectId, senderId: Types.ObjectId, content: string) => {
//   const io = getSocketIO();
//   const room = await Room.findById(roomId);

//   if (!room) {
//     throw new Error("Room not found");
//   }

//   // Create and save message
//   const message = await Message.create({
//     room: roomId,
//     sender: senderId,
//     content,
//   });

//   // Populate sender info before sending
//   const populatedMessage = await Message.findById(message._id).populate("sender", "name email role").lean();

//   // Emit message to all users in the room
//   io.to(roomId.toString()).emit("new_message", populatedMessage);

//   return message;
// };

// // Send a broadcast message to multiple users
// export const sendBroadcast = async (adminId: Types.ObjectId, broadcastData: { title: string; content: string; targetGroups: { jobSeekers: boolean; employers: boolean; specific: Types.ObjectId[] } }) => {
//   const io = getSocketIO();
//   const { title, content, targetGroups } = broadcastData;

//   // Create broadcast record
//   const broadcast = await Broadcast.create({
//     title,
//     content,
//     sender: adminId,
//     targetGroups,
//   });

//   // Find all targeted users
//   let targetUsers: (Types.ObjectId | string)[] = [];

//   if (targetGroups.jobSeekers) {
//     const jobSeekers = await User.find({ role: "job-seeker" }).select("_id");
//     targetUsers = [...targetUsers, ...jobSeekers.map(user => user._id)];
//   }

//   if (targetGroups.employers) {
//     const employers = await User.find({ role: "employer" }).select("_id");
//     targetUsers = [...targetUsers, ...employers.map(user => user._id)];
//   }

//   if (targetGroups.specific && targetGroups.specific.length > 0) {
//     targetUsers = [...targetUsers, ...targetGroups.specific];
//   }

//   // Remove duplicates
//   targetUsers = [...new Set(targetUsers)];

//   // Create a broadcast room
//   const room = await createBroadcastRoom(adminId, targetUsers);

//   // Send the broadcast message to the room
//   await sendMessageToRoom(room._id, adminId, content);

//   // Emit to each user individually
//   for (const userId of targetUsers) {
//     // Add to delivered list
//     await Broadcast.findByIdAndUpdate(broadcast._id, {
//       $push: { deliveredTo: { user: userId } },
//     });

//     // Emit to user's personal room
//     io.to(userId.toString()).emit("new_broadcast", {
//       broadcastId: broadcast._id,
//       title,
//       content,
//       sender: adminId,
//       roomId: room._id,
//     });
//   }

//   return { broadcast, room };
// };

// // Join a user to a room
// export const joinRoom = async (userId: Types.ObjectId | string, roomId: Types.ObjectId) => {
//   const io = getSocketIO();
//   const userSocket = io.sockets.sockets.get(userId as string);

//   if (userSocket) {
//     userSocket.join(roomId.toString());
//     return true;
//   }

//   return false;
// };

// // Get chat history for a room
// export const getChatHistory = async (roomId: Types.ObjectId, limit = 50, skip = 0) => {
//   return await Message.find({ room: roomId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("sender", "name email role").lean();
// };

// // Mark messages as read
// export const markMessagesAsRead = async (roomId: Types.ObjectId, userId: Types.ObjectId) => {
//   const messages = await Message.find({
//     room: roomId,
//     "readBy.user": { $ne: userId },
//   });

//   for (const message of messages) {
//     await Message.findByIdAndUpdate(message._id, {
//       $push: { readBy: { user: userId } },
//     });
//   }

//   return messages.length;
// };
