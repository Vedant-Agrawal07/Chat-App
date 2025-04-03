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

const app = express();
app.use(express.json()); // to accept json data

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
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log(`connected to ${socket.id}`);


  socket.on("setup", (userData) => {
    socket.join(userData._id);
    console.log(userData._id);
    
    socket.emit("connected");
  });

  socket.on("joinChat" , (room)=>{
    socket.join(room);
    console.log(`user joined room ${room}`);
  })

  socket.on("send-message" , (message , room)=>{
    console.log(room);

    socket.to(room).emit("receive-message" , message , room);
  })

});
