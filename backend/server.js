import express from "express";
import chats from "./data.js";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import chatRoutes from "./routes/chatRoutes.js";
import messageRoute from "./routes/messageRoute.js";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: ["https://chat-app-b4cc.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.options("*", cors());
app.use(express.json());

dotenv.config();
connectDB();

app.get("/", (req, res) => {
  res.send("api success");
});

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoute);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 7000;
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`the server is running on ${PORT}`);
});

const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: ["https://chat-app-b4cc.vercel.app", "http://localhost:5173"],
  },
});

// Map to store online users: userId -> socketId
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log(`connected to ${socket.id}`);

  // Save user socket
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    onlineUsers.set(userData._id, socket.id);
    console.log("User connected:", userData._id);
    socket.emit("connected");
  });

  socket.on("disconnect", () => {
    for (let [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) onlineUsers.delete(userId);
    }
  });

  // Messaging events (unchanged)
  socket.on("joinChat", (room) => {
    socket.join(room);
    console.log(`user joined room ${room}`);
  });

  socket.on("send-message", (message, room) => {
    socket.to(room).emit("receive-message", message, room);
  });

  socket.on("removedUser", (id) => {
    socket.to(id).emit("updateRemovedUser");
  });

  socket.on("typingIndicate", (indicator, chatId) => {
    socket.to(chatId).emit("indicator", indicator);
  });

  // --- VIDEO CALL / WEBRTC EVENTS ---
  socket.on("call-user", ({ toUserId, fromUserId }) => {
    const calleeSocketId = onlineUsers.get(toUserId);
    if (calleeSocketId) {
      io.to(calleeSocketId).emit("incoming-call", {
        fromUserId,
        callerSocketId: socket.id,
      });
    }
  });

  socket.on("accept-call", ({ callerSocketId, answer }) => {
    io.to(callerSocketId).emit("call-accepted", { answer });
  });

  socket.on("webrtc-offer", ({ toSocketId, offer }) => {
    io.to(toSocketId).emit("webrtc-offer", { offer, fromSocketId: socket.id });
  });

  socket.on("webrtc-answer", ({ toSocketId, answer }) => {
    io.to(toSocketId).emit("webrtc-answer", { answer });
  });

  socket.on("webrtc-candidate", ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit("webrtc-candidate", { candidate });
  });

  socket.on("end-call", ({ toSocketId }) => {
    io.to(toSocketId).emit("call-ended");
  });
});
