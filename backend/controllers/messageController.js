
import Message from "../models/Message.js";
import CommunityUser from "../models/CommunityUser.js";

// ============================================================
// HELPER: GET SOCKET.IO INSTANCE
// ============================================================

const getIO = (req) => req.app.get("io");

// ============================================================
// HELPER: FORMAT ATTACHMENT DATA
// ============================================================

const getAttachmentData = (file) => {
  if (!file) return null;

  return {
    originalName: file.originalname,
    fileName: file.filename,
    url: `/uploads/${file.filename}`,
    mimeType: file.mimetype,
    size: file.size,
  };
};

// ============================================================
// HELPER: FORMAT MESSAGE RESPONSE
// ============================================================

const formatMessage = (message) => {
  const data =
    typeof message.toObject === "function"
      ? message.toObject()
      : message;

  return {
    ...data,
    isEdited: data.isEdited === true,
    attachment: data.attachment || null,
  };
};

// ============================================================
// HELPER: GET CURRENT MEMBER PROFILES
// ============================================================

const getCommunityProfiles = async (messages) => {
  const wallets = [
    ...new Set(
      messages
        .map((message) =>
          String(message.senderWallet || "")
            .toLowerCase()
            .trim()
        )
        .filter(Boolean)
    ),
  ];

  if (!wallets.length) {
    return new Map();
  }

  const members = await CommunityUser.find({
    walletAddress: { $in: wallets },
  })
    .select("walletAddress fullName username profileImage")
    .lean();

  return new Map(
    members.map((member) => [
      member.walletAddress.toLowerCase(),
      member,
    ])
  );
};

// ============================================================
// HELPER: ADD CURRENT PROFILE PHOTOS TO MESSAGES
// ============================================================

const formatMessagesWithProfiles = async (messages) => {
  const profiles = await getCommunityProfiles(messages);

  return messages.map((message) => {
    const formatted = formatMessage(message);

    const wallet = String(
      formatted.senderWallet || ""
    )
      .toLowerCase()
      .trim();

    const profile = profiles.get(wallet);

    // Admin messages or messages without a member profile
    // retain their existing sender information.
    if (!profile) {
      return formatted;
    }

    return {
      ...formatted,
      senderName: profile.fullName || formatted.senderName,
      senderAvatar: profile.profileImage || "",
    };
  });
};

// ============================================================
// HELPER: GET AUTHENTICATED MEMBER PROFILE
// ============================================================

const getAuthenticatedMemberProfile = async (walletAddress) => {
  if (!walletAddress) {
    return null;
  }

  return CommunityUser.findOne({
    walletAddress: walletAddress.toLowerCase(),
  }).select("walletAddress fullName username profileImage isBanned");
};

// ============================================================
// 1. GET GROUP MESSAGES
// GET /api/messages/group
// ============================================================

export const getGroupMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chatType: "GROUP",
    }).sort({ createdAt: 1 });

    const formattedMessages =
      await formatMessagesWithProfiles(messages);

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("Get group messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch group messages",
    });
  }
};

// ============================================================
// 2. CREATE GROUP MESSAGE WITH OPTIONAL DOCUMENT
// POST /api/messages/group
// ============================================================

export const createGroupMessage = async (req, res) => {
  try {
    const senderWallet = req.user?.walletAddress;

    const { message } = req.body;

    const text =
      typeof message === "string" ? message.trim() : "";

    const attachment = getAttachmentData(req.file);

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Always retrieve the sender's profile from MongoDB.
    // Do not trust the avatar or name supplied by the frontend.
    const profile = await getAuthenticatedMemberProfile(
      senderWallet
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Community X profile not found",
      });
    }

    if (profile.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Your account is banned from the community",
      });
    }

    if (!text && !attachment) {
      return res.status(400).json({
        success: false,
        message: "Enter a message or attach a document",
      });
    }

    const newMessage = await Message.create({
      senderWallet: profile.walletAddress,
      senderName: profile.fullName,
      senderAvatar: "",
      message: text,
      chatType: "GROUP",
      attachment,
      isEdited: false,
    });

    // Return the actual profile photo immediately.
    // The database lookup also supplies the photo on future reads.
    const responseMessage = {
      ...formatMessage(newMessage),
      senderName: profile.fullName,
      senderAvatar: profile.profileImage || "",
    };

    const io = getIO(req);

    if (io) {
      io.emit("new-group-message", responseMessage);
    }

    return res.status(201).json({
      success: true,
      message: "Group message sent successfully",
      data: responseMessage,
    });
  } catch (error) {
    console.error("Create group message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send group message",
    });
  }
};

// ============================================================
// 3. UPDATE GROUP MESSAGE
// PUT /api/messages/group/:id
// ============================================================

export const updateGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const senderWallet = req.user?.walletAddress;

    const text =
      typeof message === "string" ? message.trim() : "";

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const existingMessage = await Message.findOne({
      _id: id,
      chatType: "GROUP",
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Group message not found",
      });
    }

    if (
      existingMessage.senderWallet?.toLowerCase() !==
      senderWallet.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    existingMessage.message = text;
    existingMessage.isEdited = true;

    await existingMessage.save();

    const responseMessage = formatMessage(existingMessage);
    const io = getIO(req);

    if (io) {
      io.emit("message-updated", responseMessage);
    }

    return res.status(200).json({
      success: true,
      message: "Group message updated successfully",
      data: responseMessage,
    });
  } catch (error) {
    console.error("Update group message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update group message",
    });
  }
};

// ============================================================
// 4. DELETE GROUP MESSAGE
// DELETE /api/messages/group/:id
// ============================================================

export const deleteGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const senderWallet = req.user?.walletAddress;

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const existingMessage = await Message.findOne({
      _id: id,
      chatType: "GROUP",
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Group message not found",
      });
    }

    if (
      existingMessage.senderWallet?.toLowerCase() !==
      senderWallet.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    await Message.findByIdAndDelete(id);

    const io = getIO(req);

    if (io) {
      io.emit("message-deleted", {
        _id: id,
        chatType: "GROUP",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Group message deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Delete group message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete group message",
    });
  }
};

// ============================================================
// 5. GET PRIVATE MESSAGES
// GET /api/messages/private/:wallet
// ============================================================

export const getPrivateMessages = async (req, res) => {
  try {
    const senderWallet = req.user?.walletAddress;
    const targetWallet = req.params.wallet;

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!targetWallet) {
      return res.status(400).json({
        success: false,
        message: "Target wallet is required",
      });
    }

    const currentWallet = senderWallet.toLowerCase();
    const otherWallet = targetWallet.toLowerCase();

    const messages = await Message.find({
      chatType: "PRIVATE",
      $or: [
        {
          senderWallet: currentWallet,
          receiverWallet: otherWallet,
        },
        {
          senderWallet: otherWallet,
          receiverWallet: currentWallet,
        },
      ],
    }).sort({ createdAt: 1 });

    const formattedMessages =
      await formatMessagesWithProfiles(messages);

    return res.status(200).json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error) {
    console.error("Get private messages error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch private messages",
    });
  }
};

// ============================================================
// 6. CREATE PRIVATE MESSAGE WITH OPTIONAL DOCUMENT
// POST /api/messages/private/:wallet
// ============================================================

export const createPrivateMessage = async (req, res) => {
  try {
    const senderWallet = req.user?.walletAddress;
    const targetWallet = req.params.wallet;

    const { message } = req.body;

    const text =
      typeof message === "string" ? message.trim() : "";

    const attachment = getAttachmentData(req.file);

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!targetWallet) {
      return res.status(400).json({
        success: false,
        message: "Recipient wallet is required",
      });
    }

    // Always retrieve the authenticated sender's real profile.
    const profile = await getAuthenticatedMemberProfile(
      senderWallet
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Community X profile not found",
      });
    }

    if (profile.isBanned) {
      return res.status(403).json({
        success: false,
        message: "Your account is banned from the community",
      });
    }

    if (!text && !attachment) {
      return res.status(400).json({
        success: false,
        message: "Enter a message or attach a document",
      });
    }

    const newMessage = await Message.create({
      senderWallet: profile.walletAddress,
      senderName: profile.fullName,
      senderAvatar: "",
      message: text,
      chatType: "PRIVATE",
      receiverWallet: targetWallet.toLowerCase(),
      attachment,
      isEdited: false,
    });

    const responseMessage = {
      ...formatMessage(newMessage),
      senderName: profile.fullName,
      senderAvatar: profile.profileImage || "",
    };

    const io = getIO(req);

    if (io) {
      // Notify sender and receiver wallet rooms.
      io.to(`wallet:${profile.walletAddress}`).emit(
        "new-private-message",
        responseMessage
      );

      io.to(`wallet:${targetWallet.toLowerCase()}`).emit(
        "new-private-message",
        responseMessage
      );
    }

    return res.status(201).json({
      success: true,
      message: "Private message sent successfully",
      data: responseMessage,
    });
  } catch (error) {
    console.error("Create private message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send private message",
    });
  }
};

// ============================================================
// 7. UPDATE PRIVATE MESSAGE
// PUT /api/messages/private/:id
// ============================================================

export const updatePrivateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const senderWallet = req.user?.walletAddress;

    const text =
      typeof message === "string" ? message.trim() : "";

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const existingMessage = await Message.findOne({
      _id: id,
      chatType: "PRIVATE",
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Private message not found",
      });
    }

    if (
      existingMessage.senderWallet?.toLowerCase() !==
      senderWallet.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    existingMessage.message = text;
    existingMessage.isEdited = true;

    await existingMessage.save();

    const responseMessage = formatMessage(existingMessage);
    const io = getIO(req);

    if (io) {
      io.to(
        `wallet:${existingMessage.senderWallet.toLowerCase()}`
      ).emit("private-message-updated", responseMessage);

      io.to(
        `wallet:${existingMessage.receiverWallet.toLowerCase()}`
      ).emit("private-message-updated", responseMessage);

      // Compatibility event for existing frontend listeners.
      io.emit("message-updated", responseMessage);
    }

    return res.status(200).json({
      success: true,
      message: "Private message updated successfully",
      data: responseMessage,
    });
  } catch (error) {
    console.error("Update private message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update private message",
    });
  }
};

// ============================================================
// 8. DELETE PRIVATE MESSAGE
// DELETE /api/messages/private/:id
// ============================================================

export const deletePrivateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const senderWallet = req.user?.walletAddress;

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const existingMessage = await Message.findOne({
      _id: id,
      chatType: "PRIVATE",
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: "Private message not found",
      });
    }

    if (
      existingMessage.senderWallet?.toLowerCase() !==
      senderWallet.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    await Message.findByIdAndDelete(id);

    const io = getIO(req);

    if (io) {
      const payload = {
        _id: id,
        chatType: "PRIVATE",
        senderWallet: existingMessage.senderWallet,
        receiverWallet: existingMessage.receiverWallet,
      };

      io.to(
        `wallet:${existingMessage.senderWallet.toLowerCase()}`
      ).emit("private-message-deleted", payload);

      io.to(
        `wallet:${existingMessage.receiverWallet.toLowerCase()}`
      ).emit("private-message-deleted", payload);

      io.emit("message-deleted", payload);
    }

    return res.status(200).json({
      success: true,
      message: "Private message deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Delete private message error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete private message",
    });
  }
};
