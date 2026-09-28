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
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Authenticated wallet address is missing",
      });
    }

    const user = await CommunityUser.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
        message: "Community X profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      user,
    });
  } catch (error) {
    console.error(
      "Check Community Profile Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error while checking profile",
    });
  }
};