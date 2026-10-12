
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import communityRoutes from "./routes/communityRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";
import adminRoutes from "./routes/adminRoutes.js";
import announcementRoutes from "./routes/announcementRoutes.js";

dotenv.config();

const app = express();

// ============================================================
// DIRECTORY CONFIGURATION
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
  cors({
    origin:
      process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());

// ============================================================
// UPLOADED DOCUMENTS
// ============================================================

// Serves files saved in the backend's uploads directory.
// Example: http://localhost:5000/uploads/document.pdf
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

// ============================================================
// API ROUTES
// ============================================================

// Web3 authentication
app.use("/api/auth", authRoutes);

// Admin authentication and operations
app.use("/api/admin", adminRoutes);

// Community profile routes
app.use("/api/community", communityRoutes);

// Group and private messaging
app.use("/api/messages", messageRoutes);

// Announcements — published announcements for members
app.use("/api/announcements", announcementRoutes);

// ============================================================
// TEST AUTHENTICATION
// ============================================================

app.get("/api/test-auth", authMiddleware, (req, res) => {
  return res.json({
    success: true,
    message: "JWT authentication is working",
    user: req.user,
  });
});

// ============================================================
// ROOT API
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TGPS Blockchain Community X API is running",
  });
});

export default app;

