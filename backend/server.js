import dotenv from "dotenv";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// ============================================================
// CREATE HTTP SERVER
// ============================================================

const server = http.createServer(app);

// ============================================================
// CREATE SOCKET.IO SERVER
// ============================================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ============================================================
// MAKE SOCKET.IO AVAILABLE INSIDE EXPRESS CONTROLLERS
// ============================================================

app.set("io", io);

// ============================================================
// SOCKET.IO CONNECTION
// ============================================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ==========================================================
  // SOCKET AUTHENTICATION
  // ==========================================================

  socket.on("authenticate-socket", ({ token }) => {
    try {
      // --------------------------------------------------------
      // CHECK TOKEN
      // --------------------------------------------------------

      if (!token) {
        console.log(
          "Socket authentication failed: token missing"
        );

        socket.emit("socket-auth-error", {
          message: "Authentication token is required",
        });

        return;
      }

      // --------------------------------------------------------
      // VERIFY JWT
      // --------------------------------------------------------

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      console.log(
        "Socket JWT verified successfully"
      );

      // --------------------------------------------------------
      // GET WALLET ADDRESS
      // --------------------------------------------------------

      const walletAddress =
        decoded.walletAddress?.toLowerCase();

      if (!walletAddress) {
        console.log(
          "Socket authentication failed: wallet missing"
        );

        socket.emit("socket-auth-error", {
          message:
            "Wallet address not found in authentication token",
        });

        return;
      }

      // --------------------------------------------------------
      // CREATE WALLET-SPECIFIC ROOM
      // --------------------------------------------------------

      const walletRoom =
        `wallet:${walletAddress}`;

      // --------------------------------------------------------
      // JOIN ROOM
      // --------------------------------------------------------

      socket.join(walletRoom);

      // --------------------------------------------------------
      // STORE WALLET INFORMATION ON SOCKET
      // --------------------------------------------------------

      socket.walletAddress =
        walletAddress;

      // --------------------------------------------------------
      // SUCCESS LOG
      // --------------------------------------------------------

      console.log(
        `Socket authenticated: ${walletAddress}`
      );

      console.log(
        `Joined room: ${walletRoom}`
      );

      // --------------------------------------------------------
      // SEND SUCCESS TO FRONTEND
      // --------------------------------------------------------

      socket.emit("socket-authenticated", {
        success: true,
        walletAddress,
      });

    } catch (error) {
      console.error(
        "Socket authentication error:",
        error
      );

      socket.emit("socket-auth-error", {
        message:
          "Invalid or expired authentication token",
      });
    }
  });

  // ==========================================================
  // DISCONNECT
  // ==========================================================

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );

    console.log(
      "Socket.IO server is ready"
    );
  });
};

startServer();