import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import communityRoutes from "./routes/communityRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

app.use(express.json());

// Web3 authentication routes
app.use("/api/auth", authRoutes);

// Community profile routes
app.use("/api/community", communityRoutes);

// messageRoutes
app.use("/api/messages", messageRoutes);

app.get("/api/test-auth", authMiddleware, (req, res) => {
  return res.json({
    success: true,
    message: "JWT authentication is working",
    user: req.user,
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "TGPS Blockchain Community X API is running",
  });
});

export default app; 