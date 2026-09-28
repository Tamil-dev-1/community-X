import express from "express";

import {
  getGroupMessages,
  createGroupMessage,
  updateGroupMessage,
  deleteGroupMessage,
} from "../controllers/messageController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected group chat routes
router.get(
  "/group",
  authMiddleware,
  getGroupMessages
);

router.post(
  "/group",
  authMiddleware,
  createGroupMessage
);

router.put(
  "/group/:id",
  authMiddleware,
  updateGroupMessage
);

router.delete(
  "/group/:id",
  authMiddleware,
  deleteGroupMessage
);

export default router;