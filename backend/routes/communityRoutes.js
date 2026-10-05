import express from "express";

import {
  createCommunityProfile,
  checkCommunityProfile,
  getCommunityMembers,
} from "../controllers/communityController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected Community X routes
router.post(
  "/profile",
  authMiddleware,
  createCommunityProfile
);

router.get(
  "/profile/check",
  authMiddleware,
  checkCommunityProfile
);

router.get(
  "/members",
  authMiddleware,
  getCommunityMembers
);

export default router;