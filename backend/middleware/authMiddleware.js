import jwt from "jsonwebtoken";
import CommunityUser from "../models/CommunityUser.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format",
    });
  }

  const token = authHeader.split(" ")[1];

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("JWT Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  const walletAddress = decoded.walletAddress;

  if (
    typeof walletAddress !== "string" ||
    !walletAddress.trim()
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid member authentication token",
    });
  }

  try {
    const communityUser = await CommunityUser.findOne({
      walletAddress: walletAddress.toLowerCase(),
    }).select(
      "walletAddress fullName username profileImage isBanned banReason bannedAt"
    );

    if (!communityUser) {
      return res.status(401).json({
        success: false,
        message: "Community member account not found",
      });
    }

    if (communityUser.isBanned) {
      return res.status(403).json({
        success: false,
        code: "COMMUNITY_MEMBER_BANNED",
        message: "Your Community X access has been suspended.",
        reason:
          communityUser.banReason || "No reason provided",
        bannedAt: communityUser.bannedAt,
        user: {
          walletAddress: communityUser.walletAddress,
          fullName: communityUser.fullName,
          username: communityUser.username,
          profileImage: communityUser.profileImage,
          isBanned: true,
        },
      });
    }

    req.user = decoded;
    req.communityUser = communityUser;

    return next();
  } catch (error) {
    console.error(
      "Member database authentication error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify community member status",
    });
  }
};

export default authMiddleware;