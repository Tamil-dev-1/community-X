
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server using Express app
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Make Socket.IO available inside Express controllers
app.set("io", io);

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
    console.log("Socket.IO server is ready");
  });
};

startServer();
