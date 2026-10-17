
import dotenv from "dotenv";
import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import app from "./app.js";
import connectDB from "./config/db.js";
import Admin from "./models/Admin.js";
import CommunityUser from "./models/CommunityUser.js";

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

// Make Socket.IO available inside Express controllers.
app.set("io", io);

// ============================================================
// ONLINE PRESENCE TRACKER
// Supports multiple tabs/devices for the same identity.
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

// ============================================================
// REMOVE SOCKET FROM PRESENCE
// ============================================================

const removePresence = (socket) => {
  if (!socket.presenceKey) return;

  const key = socket.presenceKey;
  const user = activeUsers.get(key);

  // Clear the socket reference even if the presence record
  // is missing.
  socket.presenceKey = null;

  if (!user) return;

  user.sockets.delete(socket.id);

  // Another tab/device is still connected.
  if (user.sockets.size > 0) return;

  user.lastSeen = new Date().toISOString();

  io.emit("presence-update", getPresencePayload(user));
};

// ============================================================
// CLEAR PREVIOUS SOCKET AUTHENTICATION
// ============================================================

const clearSocketAuthentication = (socket) => {
  removePresence(socket);

  // Remove old room memberships.
  // Socket.IO automatically maintains the socket's own room.
  for (const room of [...socket.rooms]) {
    if (room !== socket.id) {
      socket.leave(room);
    }
  }

  // Clear trusted identity information.
  delete socket.walletAddress;
  delete socket.adminId;
  delete socket.adminRole;
  delete socket.userType;
};

// ============================================================
// JWT HELPERS
// ============================================================

const verifySocketToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (typeof token !== "string" || !token.trim()) {
    throw new Error("Authentication token is required");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid authentication token");
  }

  return decoded;
};

// ============================================================
// SEND PRESENCE SNAPSHOT
// ============================================================

const sendPresenceSnapshot = (socket) => {
  socket.emit(
    "presence-snapshot",
    Array.from(activeUsers.values()).map(getPresencePayload)
  );
};

// ============================================================
// SOCKET.IO CONNECTION
// ============================================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ==========================================================
  // MEMBER SOCKET AUTHENTICATION
  //
  // Event: authenticate-socket
  // Room: wallet:<walletAddress>
  // ==========================================================

  socket.on("authenticate-socket", async ({ token } = {}) => {
    // A failed re-authentication must not leave the socket
    // authenticated as its previous identity.
    clearSocketAuthentication(socket);

    try {
      const decoded = verifySocketToken(token);

      // An admin token must never authenticate as a member.
      if (decoded.role === "ADMIN") {
        socket.emit("socket-auth-error", {
          message: "Member authentication required",
        });

        return;
      }

      const walletAddress =
        typeof decoded.walletAddress === "string"
          ? decoded.walletAddress.toLowerCase().trim()
          : "";

      if (!walletAddress) {
        socket.emit("socket-auth-error", {
          message: "Wallet address not found in authentication token",
        });

        return;
      }

      // Check the database on every socket authentication.
      // This also rejects banned members whose old JWT is
      // still valid.
      const member = await CommunityUser.findOne({
        $expr: {
          $eq: [{ $toLower: "$walletAddress" }, walletAddress],
        },
      }).select("walletAddress isBanned banReason bannedAt");

      // IMPORTANT: check whether the member exists FIRST.
      if (!member) {
        socket.emit("socket-auth-error", {
          message: "Community member not found",
        });

        return;
      }

      // Reject banned members, including those with an
      // existing, unexpired JWT.
      if (member.isBanned) {
        clearSocketAuthentication(socket);

        socket.emit("socket-auth-error", {
          code: "COMMUNITY_MEMBER_BANNED",
          message: "Your Community X access has been suspended.",
          reason: member.banReason || "No reason provided",
          bannedAt: member.bannedAt,
        });

        return;
      }

      const walletRoom = `wallet:${walletAddress}`;

      socket.walletAddress = walletAddress;
      socket.userType = "MEMBER";

      await socket.join(walletRoom);

      registerPresence(socket, "MEMBER", walletAddress);

      console.log(`Member socket authenticated: ${walletAddress}`);

      socket.emit("socket-authenticated", {
        success: true,
        walletAddress,
        room: walletRoom,
        role: "MEMBER",
      });

      sendPresenceSnapshot(socket);
    } catch (error) {
      console.error(
        "Member socket authentication failed:",
        error.message
      );

      clearSocketAuthentication(socket);

      socket.emit("socket-auth-error", {
        message: "Invalid or expired member authentication token",
      });
    }
  });

  // ==========================================================
  // ADMIN SOCKET AUTHENTICATION
  //
  // Event: authenticate-admin-socket
  //
  // Rooms:
  // admin:<adminId>
  // wallet:admin:<adminId>
  // ==========================================================

  socket.on(
    "authenticate-admin-socket",
    async ({ token } = {}) => {
      // Remove any previous member/admin identity and rooms.
      clearSocketAuthentication(socket);

      try {
        const decoded = verifySocketToken(token);

        // Only an explicit ADMIN role is accepted.
        if (
          decoded.role !== "ADMIN" ||
          typeof decoded.adminId !== "string" ||
          !decoded.adminId.trim()
        ) {
          socket.emit("admin-socket-auth-error", {
            message: "Admin access denied",
          });

          return;
        }

        // Admin model stores adminId in uppercase.
        const normalizedAdminId = decoded.adminId.trim().toUpperCase();

        // Verify that the administrator still exists and
        // has an active account in MongoDB.
        const admin = await Admin.findOne({
          adminId: normalizedAdminId,
          role: "ADMIN",
          isActive: true,
        }).select("adminId username role isActive");

        if (!admin) {
          socket.emit("admin-socket-auth-error", {
            message: "Admin account is inactive or no longer exists",
          });

          return;
        }

        // Preserve the lowercase identity used by existing
        // Community X messaging and presence rooms.
        const adminIdentity = admin.adminId.toLowerCase();

        const adminRoom = `admin:${adminIdentity}`;

        // Keep this room for existing private chat compatibility.
        const adminPrivateRoom = `wallet:admin:${adminIdentity}`;

        socket.adminId = adminIdentity;
        socket.adminRole = admin.role;
        socket.userType = "ADMIN";

        await Promise.all([
          socket.join(adminRoom),
          socket.join(adminPrivateRoom),
        ]);

        registerPresence(socket, "ADMIN", adminIdentity);

        console.log(`Admin socket authenticated: ${adminIdentity}`);
        console.log(`Admin joined room: ${adminRoom}`);
        console.log(
          `Admin joined private compatibility room: ${adminPrivateRoom}`
        );

        socket.emit("admin-socket-authenticated", {
          success: true,
          adminId: adminIdentity,
          role: admin.role,
          room: adminRoom,
          privateRoom: adminPrivateRoom,
        });

        sendPresenceSnapshot(socket);
      } catch (error) {
        console.error(
          "Admin socket authentication failed:",
          error.message
        );

        // Fail closed: don't retain any previous identity.
        clearSocketAuthentication(socket);

        socket.emit("admin-socket-auth-error", {
          message: "Invalid or expired admin authentication token",
        });
      }
    }
  );

  // ==========================================================
  // REQUEST PRESENCE SNAPSHOT
  // Only authenticated clients may request it.
  // ==========================================================

  socket.on("get-presence-snapshot", () => {
    if (
      socket.userType !== "MEMBER" &&
      socket.userType !== "ADMIN"
    ) {
      return;
    }

    sendPresenceSnapshot(socket);
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
      console.log(`Admin socket disconnected: ${socket.adminId}`);
    }

    removePresence(socket);
  });
});

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET is missing from backend environment variables"
      );
    }

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
