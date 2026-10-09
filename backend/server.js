
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
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ============================================================
// MAKE SOCKET.IO AVAILABLE INSIDE EXPRESS CONTROLLERS
// ============================================================

app.set("io", io);

// ============================================================
// ONLINE PRESENCE TRACKER
// Tracks multiple tabs/devices for the same user.
// ============================================================

const activeUsers = new Map();

const getPresencePayload = (user) => ({
  userType: user.userType,
  walletAddress: user.walletAddress || null,
  adminId: user.adminId || null,
  status: user.sockets.size > 0 ? "online" : "offline",
  lastSeen: user.lastSeen,
});

const registerPresence = (socket, userType, identity) => {
  const key = `${userType}:${identity}`;

  let user = activeUsers.get(key);

  if (!user) {
    user = {
      userType,
      walletAddress: userType === "MEMBER" ? identity : null,
      adminId: userType === "ADMIN" ? identity : null,
      sockets: new Set(),
      lastSeen: null,
    };

    activeUsers.set(key, user);
  }

  const wasOffline = user.sockets.size === 0;

  user.sockets.add(socket.id);
  socket.presenceKey = key;

  if (wasOffline) {
    io.emit("presence-update", getPresencePayload(user));
  }
};

const removePresence = (socket) => {
  if (!socket.presenceKey) return;

  const user = activeUsers.get(socket.presenceKey);

  if (!user) {
    socket.presenceKey = null;
    return;
  }

  user.sockets.delete(socket.id);

  // Another tab/device is still connected.
  if (user.sockets.size > 0) {
    socket.presenceKey = null;
    return;
  }

  user.lastSeen = new Date().toISOString();

  io.emit("presence-update", getPresencePayload(user));

  socket.presenceKey = null;
};

// ============================================================
// SOCKET.IO CONNECTION
// ============================================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ==========================================================
  // MEMBER SOCKET AUTHENTICATION
  // Event: authenticate-socket
  // Room: wallet:<walletAddress>
  // ==========================================================

  socket.on("authenticate-socket", ({ token } = {}) => {
    try {
      if (!token) {
        socket.emit("socket-auth-error", {
          message: "Authentication token is required",
        });
        return;
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const walletAddress =
        decoded.walletAddress?.toLowerCase().trim();

      if (!walletAddress) {
        socket.emit("socket-auth-error", {
          message:
            "Wallet address not found in authentication token",
        });
        return;
      }

      // If this socket was already authenticated, remove its
      // previous presence before registering the new identity.
      removePresence(socket);

      const walletRoom = `wallet:${walletAddress}`;

      socket.join(walletRoom);

      socket.walletAddress = walletAddress;
      socket.userType = "MEMBER";

      registerPresence(socket, "MEMBER", walletAddress);

      console.log(
        `Member socket authenticated: ${walletAddress}`
      );

      socket.emit("socket-authenticated", {
        success: true,
        walletAddress,
        room: walletRoom,
        role: "MEMBER",
      });

      // Send current presence to this newly authenticated client.
      socket.emit(
        "presence-snapshot",
        Array.from(activeUsers.values()).map(getPresencePayload)
      );
    } catch (error) {
      console.error("Socket authentication error:", error);

      socket.emit("socket-auth-error", {
        message: "Invalid or expired authentication token",
      });
    }
  });

  // ==========================================================
  // ADMIN SOCKET AUTHENTICATION
  // Event: authenticate-admin-socket
  // Rooms:
  //   admin:<adminId>
  //   wallet:admin:<adminId>
  // ==========================================================

  socket.on(
    "authenticate-admin-socket",
    ({ token } = {}) => {
      try {
        if (!token) {
          socket.emit("admin-socket-auth-error", {
            message: "Admin authentication token is required",
          });
          return;
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET
        );

        const adminId = decoded.adminId;

        if (!adminId) {
          socket.emit("admin-socket-auth-error", {
            message: "Admin ID not found in authentication token",
          });
          return;
        }

        if (decoded.role !== "ADMIN") {
          socket.emit("admin-socket-auth-error", {
            message: "Admin access denied",
          });
          return;
        }

        const normalizedAdminId = String(adminId)
          .toLowerCase()
          .trim();

        // If this socket was already authenticated, remove its
        // previous presence before registering the new identity.
        removePresence(socket);

        const adminRoom = `admin:${normalizedAdminId}`;

        // Keep this compatibility room for existing private chat.
        const adminPrivateRoom =
          `wallet:admin:${normalizedAdminId}`;

        socket.join(adminRoom);
        socket.join(adminPrivateRoom);

        socket.adminId = normalizedAdminId;
        socket.adminRole = decoded.role;
        socket.userType = "ADMIN";

        registerPresence(
          socket,
          "ADMIN",
          normalizedAdminId
        );

        console.log(
          `Admin socket authenticated: ${normalizedAdminId}`
        );

        console.log(`Admin joined room: ${adminRoom}`);
        console.log(
          `Admin joined private compatibility room: ${adminPrivateRoom}`
        );

        socket.emit("admin-socket-authenticated", {
          success: true,
          adminId: normalizedAdminId,
          role: decoded.role,
          room: adminRoom,
          privateRoom: adminPrivateRoom,
        });

        // Send current presence to this newly authenticated client.
        socket.emit(
          "presence-snapshot",
          Array.from(activeUsers.values()).map(getPresencePayload)
        );
      } catch (error) {
        console.error(
          "Admin socket authentication error:",
          error
        );

        socket.emit("admin-socket-auth-error", {
          message:
            "Invalid or expired admin authentication token",
        });
      }
    }
  );

  // ==========================================================
  // REQUEST CURRENT ONLINE/OFFLINE STATUS
  // Clients can request this after authentication.
  // ==========================================================

  socket.on("get-presence-snapshot", () => {
    if (!socket.userType) return;

    socket.emit(
      "presence-snapshot",
      Array.from(activeUsers.values()).map(getPresencePayload)
    );
  });

  // ==========================================================
  // DISCONNECT
  // ==========================================================

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id);
    console.log("Disconnect reason:", reason);

    if (socket.userType === "MEMBER") {
      console.log(
        `Member socket disconnected: ${socket.walletAddress}`
      );
    }

    if (socket.userType === "ADMIN") {
      console.log(
        `Admin socket disconnected: ${socket.adminId}`
      );
    }

    removePresence(socket);
  });
});

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log("Socket.IO server is ready");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

