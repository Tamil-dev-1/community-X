import CommunityUser from "../models/CommunityUser.js";

// Create Community X profile
export const createCommunityProfile = async (req, res) => {
  try {
    // Wallet comes from verified JWT
    const walletAddress = req.user.walletAddress;

    const {
      fullName,
      email,
      username,
      phone,
      profileImage,
      dob,
    } = req.body;

    if (
      !walletAddress ||
      !fullName ||
      !email ||
      !username ||
      !phone ||
      !dob
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check whether this wallet already has a Community X profile
    const existingWallet = await CommunityUser.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (existingWallet) {
      return res.status(409).json({
        success: false,
        message: "Community X profile already exists",
      });
    }

    // Check username
    const existingUsername = await CommunityUser.findOne({
      username: username.trim(),
    });

    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: "Username already exists",
      });
    }

    // Create profile
    const communityUser = await CommunityUser.create({
      walletAddress: walletAddress.toLowerCase(),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      username: username.trim(),
      phone: phone.trim(),
      profileImage: profileImage || "",
      dob,
    });

    return res.status(201).json({
      success: true,
      message: "Community X profile created successfully",
      user: communityUser,
    });
  } catch (error) {
    console.error(
      "Create Community Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while creating profile",
    });
  }
};

// Check whether Community X profile exists
export const checkCommunityProfile = async (req, res) => {
  try {
    // Wallet comes from verified JWT
    const walletAddress = req.user?.walletAddress?.toLowerCase();

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Authenticated wallet address is missing",
      });
    }

    const user = await CommunityUser.findOne({
      walletAddress,
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "Community X profile not found",
      });
    }

    // Block banned members, including after refresh
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        code: "COMMUNITY_MEMBER_BANNED",
        message: "Your Community X access has been suspended.",
        reason: user.banReason || "No reason provided.",
        user: {
          walletAddress: user.walletAddress,
          fullName: user.fullName,
          username: user.username,
          profileImage: user.profileImage,
          isBanned: true,
          banReason: user.banReason || "",
          bannedAt: user.bannedAt || null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      user,
    });
  } catch (error) {
    console.error("Check Community Profile Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while checking profile",
    });
  }
};


// Get all Community X members
export const getCommunityMembers = async (req, res) => {
  try {
    const members = await CommunityUser.find({})
      .select(
        "_id walletAddress fullName username profileImage"
      )
      .sort({
        fullName: 1,
      });

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error(
      "Get Community Members Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while fetching Community X members",
    });
  }
};



/**
 * Update the authenticated member's profile photo.
 * Route: PATCH /api/community/profile/photo
 */
export const updateCommunityProfilePhoto = async (req, res) => {
  try {
    const walletAddress = req.user?.walletAddress?.toLowerCase();
    const { profileImage } = req.body;

    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message: "Authenticated wallet address is missing.",
      });
    }

    if (typeof profileImage !== "string" || !profileImage.trim()) {
      return res.status(400).json({
        success: false,
        message: "A profile image is required.",
      });
    }

    // Accept an image URL or a Base64 image data URL.
    const isHttpUrl = /^https?:\/\/\S+$/i.test(profileImage);
    const isImageDataUrl =
      /^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/]+=*$/i.test(
        profileImage
      );

    if (!isHttpUrl && !isImageDataUrl) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid image URL or supported image file.",
      });
    }

    // Prevent oversized Base64 images from being stored.
    if (isImageDataUrl && profileImage.length > 3_000_000) {
      return res.status(413).json({
        success: false,
        message: "Image is too large. Please use a smaller image.",
      });
    }

    const user = await CommunityUser.findOneAndUpdate(
      { walletAddress },
      { $set: { profileImage: profileImage.trim() } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Community X profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update Community Profile Photo Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile photo.",
    });
  }
};
