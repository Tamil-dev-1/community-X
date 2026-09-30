
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

const router = express.Router();


// ============================================================
// GROUP CHAT ROUTES
// ============================================================

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


// ============================================================
// PRIVATE CHAT ROUTES
// ============================================================

router.get(
  "/private/:wallet",
  authMiddleware,
  getPrivateMessages
);

router.post(
  "/private/:wallet",
  authMiddleware,
  createPrivateMessage
);

router.put(
  "/private/:id",
  authMiddleware,
  updatePrivateMessage
);

router.delete(
  "/private/:id",
  authMiddleware,
  deletePrivateMessage
);


export default router;

