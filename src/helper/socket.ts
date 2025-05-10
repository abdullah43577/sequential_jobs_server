// socket.ts
import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt, { Secret } from "jsonwebtoken";
import { CustomJwtPayload } from "../interface";
const { ACCESS_TOKEN_SECRET } = process.env;

let io: Server;

export const initializeSocket = function (server: HttpServer) {
  io = new Server(server);

  io.on("connection", socket => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("No token provided");
      socket.disconnect();
      return;
    }

    let userId = "";

    try {
      const { id, role } = jwt.verify(token, ACCESS_TOKEN_SECRET as Secret) as CustomJwtPayload;
      userId = id;
      socket.join(id);

      console.log(`User ${id} connected to their room`);
    } catch (error) {
      console.log("Invalid token");
      socket.disconnect();
    }

    socket.on("disconnect", () => {
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
};

export const getSocketIO = function () {
  if (!io) throw new Error("Socket.io not initialized");

  return io;
};
