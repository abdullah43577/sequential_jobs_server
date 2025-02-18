// socket.ts
import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const initializeSocket = function (server: HttpServer) {
  io = new Server(server);

  io.on("connection", socket => {
    console.log("A user connected", socket.id);

    socket.on("disconnect", () => {
      console.log("A user disconnected", socket.id);
    });
  });

  return io;
};

export const getSocketIO = function () {
  if (!io) throw new Error("Socket.io not initialized");

  return io;
};
