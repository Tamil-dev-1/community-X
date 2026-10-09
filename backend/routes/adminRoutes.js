import express from "express";

import {
  adminLogin,
  verifyAdmin,

  // Members
  getAdminMembers,

  // Group chat
  getAdminGroupMessages,
  createAdminGroupMessage,
  updateAdminGroupMessage,
  deleteAdminGroupMessage,

  // Private chat
  getAdminPrivateMessages,
  createAdminPrivateMessage,
  updateAdminPrivateMessage,
  deleteAdminPrivateMessage,
} from "../controllers/adminController.js";

import adminAuthMiddleware from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

// ============================================================
// ADMIN AUTH
// ============================================================

// POST /api/admin/login
router.post("/login", adminLogin);

// GET /api/admin/verify
router.get(
  "/verify",
  adminAuthMiddleware,
  verifyAdmin
);

// ============================================================
// ADMIN MEMBERS
// ============================================================

// GET /api/admin/members
router.get(
  "/members",
  adminAuthMiddleware,
  getAdminMembers
);

// ============================================================
// ADMIN GROUP CHAT
// ============================================================

// GET /api/admin/messages/group
router.get(
  "/messages/group",
  adminAuthMiddleware,
  getAdminGroupMessages
);

// POST /api/admin/messages/group
router.post(
  "/messages/group",
  adminAuthMiddleware,
  createAdminGroupMessage
);

// PUT /api/admin/messages/group/:id
router.put(
  "/messages/group/:id",
  adminAuthMiddleware,
  updateAdminGroupMessage
);

// DELETE /api/admin/messages/group/:id
router.delete(
  "/messages/group/:id",
  adminAuthMiddleware,
  deleteAdminGroupMessage
);

// ============================================================
// ADMIN PRIVATE CHAT
// ============================================================

// GET /api/admin/messages/private/:wallet
router.get(
  "/messages/private/:wallet",
  adminAuthMiddleware,
  getAdminPrivateMessages
);

// POST /api/admin/messages/private/:wallet
router.post(
  "/messages/private/:wallet",
  adminAuthMiddleware,
  createAdminPrivateMessage
);

// PUT /api/admin/messages/private/:id
router.put(
  "/messages/private/:id",
  adminAuthMiddleware,
  updateAdminPrivateMessage
);

// DELETE /api/admin/messages/private/:id
router.delete(
  "/messages/private/:id",
  adminAuthMiddleware,
  deleteAdminPrivateMessage
);

export default router;