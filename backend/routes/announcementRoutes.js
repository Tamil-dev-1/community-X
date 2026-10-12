
import express from "express";
import {
  getPublishedAnnouncements,
} from "../controllers/announcementController.js";

const router = express.Router();

// GET /api/announcements
// Members can read published announcements without an admin token.
router.get("/", getPublishedAnnouncements);

export default router;
