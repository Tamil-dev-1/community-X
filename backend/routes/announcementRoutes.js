
import express from "express";

import {
  getPublishedAnnouncements,
} from "../controllers/announcementController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================================
// MEMBER ANNOUNCEMENT ROUTES
// ============================================================

// GET /api/announcements
// Only authenticated, non-banned members can read announcements.
router.get(
  "/",
  authMiddleware,
  getPublishedAnnouncements
);

export default router;
