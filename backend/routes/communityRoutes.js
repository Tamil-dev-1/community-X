import express from "express";

import {
  createCommunityProfile,
  checkCommunityProfile,
  getCommunityMembers,
  updateCommunityProfilePhoto,
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


router.patch(
  "/profile/photo",
  authMiddleware,
  updateCommunityProfilePhoto
);

export default router;