import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import Admin from "../models/Admin.js";
import CommunityUser from "../models/CommunityUser.js";
import Message from "../models/Message.js";

// ============================================================
// ADMIN LOGIN
// ============================================================

export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // ----------------------------------------------------------
    // Validate request
    // ----------------------------------------------------------

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // ----------------------------------------------------------
    // Find admin
    // ----------------------------------------------------------

    const admin = await Admin.findOne({
      username: username.trim().toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    // ----------------------------------------------------------
    // Check active status
    // ----------------------------------------------------------

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive",
      });
    }

    // ----------------------------------------------------------
    // Compare password
    // IMPORTANT:
    // Admin model uses passwordHash, NOT password
    // ----------------------------------------------------------

    const isPasswordValid = await bcrypt.compare(
      password,
      admin.passwordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    // ----------------------------------------------------------
    // Create JWT
    // ----------------------------------------------------------

    const token = jwt.sign(
      {
        adminId: admin.adminId,
        username: admin.username,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // ----------------------------------------------------------
    // Send response
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Admin login successful",

      token,

      admin: {
        id: admin.adminId,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("=================================");
    console.error("Admin Login Error:", error);
    console.error("=================================");

    return res.status(500).json({
      success: false,
      message: "Server error during admin login",
    });
  }
};

// ============================================================
// VERIFY ADMIN
// ============================================================

export const verifyAdmin = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Admin authentication successful",

      admin: {
        adminId: req.admin.adminId,
        username: req.admin.username,
        role: req.admin.role,
      },
    });
  } catch (error) {
    console.error("Verify Admin Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while verifying admin",
    });
  }
};

// ============================================================
// GET ALL COMMUNITY MEMBERS - ADMIN
// ============================================================

export const getAdminMembers = async (req, res) => {
  try {
    const members = await CommunityUser.find({})
      .select(
        "_id walletAddress fullName username profileImage email phone dob"
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
    console.error("Admin Get Members Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching community members",
    });
  }
};

// ============================================================
// GET ALL GROUP MESSAGES - ADMIN
// ============================================================

export const getAdminGroupMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chatType: "GROUP",
    }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Admin Get Group Messages Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching group messages",
    });
  }
};

// ============================================================
// CREATE GROUP MESSAGE - ADMIN
// ============================================================

export const createAdminGroupMessage = async (req, res) => {
  try {
    const {
      senderName,
      senderAvatar,
      message,
    } = req.body;

    // ----------------------------------------------------------
    // Validate message
    // ----------------------------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    // ----------------------------------------------------------
    // Admin identity
    // ----------------------------------------------------------

    const adminIdentifier = `admin:${req.admin.adminId}`.toLowerCase();

    const adminName =
      senderName?.trim() ||
      req.admin.username ||
      "Admin";

    // ----------------------------------------------------------
    // Create message
    // ----------------------------------------------------------

    const newMessage = await Message.create({
      senderWallet: adminIdentifier,

      senderName: adminName,

      senderAvatar: senderAvatar || "",

      message: message.trim(),

      chatType: "GROUP",

      receiverWallet: null,
    });

    console.log("=================================");
    console.log("ADMIN GROUP MESSAGE SAVED");
    console.log("Message ID:", newMessage._id);
    console.log("Admin ID:", req.admin.adminId);
    console.log("Message:", newMessage.message);
    console.log("=================================");

    // ----------------------------------------------------------
    // Socket.IO
    // ----------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.emit("new-group-message", newMessage);
    }

    return res.status(201).json({
      success: true,
      message: "Admin group message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Admin Create Group Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating admin group message",
    });
  }
};

// ============================================================
// UPDATE GROUP MESSAGE - ADMIN
// ============================================================

export const updateAdminGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // ----------------------------------------------------------
    // Validate message
    // ----------------------------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    // ----------------------------------------------------------
    // Admin can edit any group message
    // ----------------------------------------------------------

    const updatedMessage =
      await Message.findOneAndUpdate(
        {
          _id: id,
          chatType: "GROUP",
        },
        {
          message: message.trim(),
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: "Group message not found",
      });
    }

    // ----------------------------------------------------------
    // Socket.IO
    // ----------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.emit("message-updated", updatedMessage);
    }

    return res.status(200).json({
      success: true,
      message: "Group message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Admin Update Group Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating group message",
    });
  }
};

// ============================================================
// DELETE GROUP MESSAGE - ADMIN
// ============================================================

export const deleteAdminGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;

    // ----------------------------------------------------------
    // Admin can delete any group message
    // ----------------------------------------------------------

    const deletedMessage =
      await Message.findOneAndDelete({
        _id: id,
        chatType: "GROUP",
      });

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message: "Group message not found",
      });
    }

    // ----------------------------------------------------------
    // Socket.IO
    // ----------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      io.emit("message-deleted", deletedMessage);
    }

    return res.status(200).json({
      success: true,
      message: "Group message deleted successfully",
      data: deletedMessage,
    });
  } catch (error) {
    console.error("Admin Delete Group Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting group message",
    });
  }
};

// ============================================================
// GET PRIVATE MESSAGES - ADMIN
// ============================================================

export const getAdminPrivateMessages = async (req, res) => {
  try {
    const { wallet } = req.params;

    // ----------------------------------------------------------
    // Validate member wallet
    // ----------------------------------------------------------

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Member wallet address is required",
      });
    }

    const memberWallet = wallet
      .toLowerCase()
      .trim();

    const adminIdentifier =
      `admin:${req.admin.adminId}`.toLowerCase();

    // ----------------------------------------------------------
    // Find conversation between admin and member
    // ----------------------------------------------------------

    const messages = await Message.find({
      chatType: "PRIVATE",

      $or: [
        {
          senderWallet: adminIdentifier,
          receiverWallet: memberWallet,
        },
        {
          senderWallet: memberWallet,
          receiverWallet: adminIdentifier,
        },
      ],
    }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Admin Get Private Messages Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching private messages",
    });
  }
};

// ============================================================
// CREATE PRIVATE MESSAGE - ADMIN
// ============================================================

export const createAdminPrivateMessage = async (req, res) => {
  try {
    const { wallet } = req.params;

    const {
      senderName,
      senderAvatar,
      message,
    } = req.body;

    // ----------------------------------------------------------
    // Validate wallet
    // ----------------------------------------------------------

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Member wallet address is required",
      });
    }

    // ----------------------------------------------------------
    // Validate message
    // ----------------------------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const memberWallet = wallet
      .toLowerCase()
      .trim();

    const adminIdentifier =
      `admin:${req.admin.adminId}`.toLowerCase();

    const adminName =
      senderName?.trim() ||
      req.admin.username ||
      "Admin";

    // ----------------------------------------------------------
    // Create private message
    // ----------------------------------------------------------

    const newMessage = await Message.create({
      senderWallet: adminIdentifier,

      senderName: adminName,

      senderAvatar: senderAvatar || "",

      message: message.trim(),

      chatType: "PRIVATE",

      receiverWallet: memberWallet,
    });

    // ----------------------------------------------------------
    // Socket.IO
    // ----------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const adminRoom =
        `admin:${req.admin.adminId}`;

      const memberRoom =
        `wallet:${memberWallet}`;

      io.to(adminRoom).emit(
        "new-private-message",
        newMessage
      );

      io.to(memberRoom).emit(
        "new-private-message",
        newMessage
      );
    }

    return res.status(201).json({
      success: true,
      message: "Admin private message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Admin Create Private Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating private message",
    });
  }
};

// ============================================================
// UPDATE PRIVATE MESSAGE - ADMIN
// ============================================================

export const updateAdminPrivateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // ----------------------------------------------------------
    // Validate message
    // ----------------------------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const adminIdentifier =
      `admin:${req.admin.adminId}`.toLowerCase();

    // ----------------------------------------------------------
    // Update only admin's own private message
    // ----------------------------------------------------------

    const updatedMessage =
      await Message.findOneAndUpdate(
        {
          _id: id,
          chatType: "PRIVATE",
          senderWallet: adminIdentifier,
        },
        {
          message: message.trim(),
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message:
          "Private message not found or you are not allowed to edit it",
      });
    }

    // ----------------------------------------------------------
    // Socket.IO
    // ----------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const adminRoom =
        `admin:${req.admin.adminId}`;

      const receiverRoom =
        `wallet:${updatedMessage.receiverWallet}`;

      io.to(adminRoom).emit(
        "private-message-updated",
        updatedMessage
      );

      io.to(receiverRoom).emit(
        "private-message-updated",
        updatedMessage
      );
    }

    return res.status(200).json({
      success: true,
      message: "Private message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error("Admin Update Private Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while updating private message",
    });
  }
};

// ============================================================
// DELETE PRIVATE MESSAGE - ADMIN
// ============================================================

export const deleteAdminPrivateMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const adminIdentifier =
      `admin:${req.admin.adminId}`.toLowerCase();

    // ----------------------------------------------------------
    // Delete only admin's own private message
    // ----------------------------------------------------------

    const deletedMessage =
      await Message.findOneAndDelete({
        _id: id,
        chatType: "PRIVATE",
        senderWallet: adminIdentifier,
      });

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message:
          "Private message not found or you are not allowed to delete it",
      });
    }

    // ----------------------------------------------------------
    // Socket.IO
    // ----------------------------------------------------------

    const io = req.app.get("io");

    if (io) {
      const adminRoom =
        `admin:${req.admin.adminId}`;

      const receiverRoom =
        `wallet:${deletedMessage.receiverWallet}`;

      io.to(adminRoom).emit(
        "private-message-deleted",
        deletedMessage
      );

      io.to(receiverRoom).emit(
        "private-message-deleted",
        deletedMessage
      );
    }

    return res.status(200).json({
      success: true,
      message: "Private message deleted successfully",
      data: deletedMessage,
    });
  } catch (error) {
    console.error("Admin Delete Private Message Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while deleting private message",
    });
  }
};