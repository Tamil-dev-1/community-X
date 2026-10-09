
import express from "express";

import {
  // Group chat
  getGroupMessages,
  createGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,

  // Private chat
  getPrivateMessages,
  createPrivateMessage,
  updatePrivateMessage,
  deletePrivateMessage,
} from "../controllers/messageController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ============================================================
// GROUP CHAT ROUTES
// ============================================================

// Get all group messages
router.get(
  "/group",
  authMiddleware,
  getGroupMessages
);

// Send a group message with optional document attachment
router.post(
  "/group",
  authMiddleware,
  upload.single("file"),
  createGroupMessage
);

// Edit a group message
router.put(
  "/group/:id",
  authMiddleware,
  updateGroupMessage
);

// Delete a group message
router.delete(
  "/group/:id",
  authMiddleware,
  deleteGroupMessage
);

// ============================================================
// PRIVATE CHAT ROUTES
// ============================================================

// Get private conversation messages
router.get(
  "/private/:wallet",
  authMiddleware,
  getPrivateMessages
);

// Send a private message with optional document attachment
router.post(
  "/private/:wallet",
  authMiddleware,
  upload.single("file"),
  createPrivateMessage
);

// Edit a private message
router.put(
  "/private/:id",
  authMiddleware,
  updatePrivateMessage
);

// Delete a private message
router.delete(
  "/private/:id",
  authMiddleware,
  deletePrivateMessage
);

export default router;
