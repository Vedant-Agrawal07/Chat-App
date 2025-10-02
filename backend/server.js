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

io.on("connection", (socket) => {
  console.log(`connected to ${socket.id}`);

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(userData._id);

    socket.emit("connected");
  });

  socket.on("joinChat", (room) => {
    socket.join(room);
    console.log(`user joined room ${room}`);
  });

  socket.on("send-message", (message, room) => {
    console.log(room);

    socket.to(room).emit("receive-message", message, room);
  });

  socket.on("removedUser", (id) => {
    console.log("member ", id, " removed");
    socket.to(id).emit("updateRemovedUser");
  });

  socket.on("typingIndicate", (indicator, chatId) => {
    socket.to(chatId).emit("indicator", indicator);
  });

  // --- VIDEO CALL / WEBRTC EVENTS ---
  socket.on("call-user", ({ to, from }) => {
    // Notify the callee that someone is calling
    socket.to(to).emit("incoming-call", { from });
  });

  socket.on("accept-call", ({ to, answer }) => {
    // Send the SDP answer back to the caller
    socket.to(to).emit("call-accepted", { answer });
  });

  socket.on("webrtc-offer", ({ to, offer }) => {
    // Send the SDP offer to the callee
    socket.to(to).emit("webrtc-offer", { offer, from: socket.id });
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    // Send the SDP answer to the caller
    socket.to(to).emit("webrtc-answer", { answer });
  });

  socket.on("webrtc-candidate", ({ to, candidate }) => {
    // Exchange ICE candidates
    socket.to(to).emit("webrtc-candidate", { candidate });
  });

  socket.on("end-call", ({ to }) => {
    // Notify the other user the call ended
    socket.to(to).emit("call-ended");
  });
});
