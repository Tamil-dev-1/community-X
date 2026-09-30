import Message from "../models/Message.js";

// Get all group chat messages
export const getGroupMessages = async (req, res) => {
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
    console.error("Get Group Messages Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    });
  }
};

// Create a group chat message
export const createGroupMessage = async (req, res) => {
  try {
    // Wallet comes from verified JWT
    const senderWallet =
      req.user.walletAddress;

    const {
      senderName,
      senderAvatar,
      message,
    } = req.body;

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated wallet address is missing",
      });
    }

    if (!senderName || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Sender name and message are required",
      });
    }

   const newMessage = await Message.create({
  senderWallet,
  senderName,
  senderAvatar: senderAvatar || "",
  message: message.trim(),
  chatType: "GROUP",
});

console.log("=================================");
console.log("GROUP MESSAGE SAVED TO MONGODB");
console.log("Message ID:", newMessage._id);
console.log("Sender Wallet:", newMessage.senderWallet);
console.log("Sender Name:", newMessage.senderName);
console.log("Message:", newMessage.message);
console.log("Chat Type:", newMessage.chatType);
console.log("=================================");

    // Get Socket.IO instance
    const io = req.app.get("io");

    // Send the new message to all connected users
    io.emit("new-group-message", newMessage);

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error(
      "Create Group Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating message",
    });
  }
};

// ============================================================
// UPDATE A GROUP CHAT MESSAGE
// ============================================================

export const updateGroupMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const { message } = req.body;

    // Wallet comes from JWT
    const walletAddress =
      req.user.walletAddress;

    // Make sure authenticated wallet exists
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated wallet address is missing",
      });
    }

    // Validate message
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    // Find ONLY the user's own message
    const updatedMessage =
      await Message.findOneAndUpdate(
        {
          _id: id,

          chatType: "GROUP",

          // IMPORTANT:
          // Only message owner can update
          senderWallet:
            walletAddress.toLowerCase(),
        },
        {
          message: message.trim(),
        },
        {
          new: true,
          runValidators: true,
        }
      );

    // Message not found OR belongs to another user
    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message:
          "Message not found or you are not allowed to edit this message",
      });
    }

    const io = req.app.get("io");

    io.emit("message-updated", updatedMessage);

    return res.status(200).json({
      success: true,
      message:
        "Group message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error(
      "Update Group Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating message",
    });
  }
};

// ============================================================
// DELETE A GROUP CHAT MESSAGE
// ============================================================

export const deleteGroupMessage = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // Wallet comes from JWT
    const walletAddress =
      req.user.walletAddress;

    // Make sure authenticated wallet exists
    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated wallet address is missing",
      });
    }

    // Delete ONLY the user's own message
    const deletedMessage =
      await Message.findOneAndDelete({
        _id: id,

        chatType: "GROUP",

        // IMPORTANT:
        // Only message owner can delete
        senderWallet:
          walletAddress.toLowerCase(),
      });

    // Message not found OR belongs to another user
    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message:
          "Message not found or you are not allowed to delete this message",
      });
    }

    const io = req.app.get("io");

    io.emit("message-deleted", deletedMessage);

    return res.status(200).json({
      success: true,
      message:
        "Group message deleted successfully",
      data: deletedMessage,
    });
  } catch (error) {
    console.error(
      "Delete Group Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting message",
    });
  }
};





// ============================================================
// GET PRIVATE CHAT MESSAGES
// ============================================================

export const getPrivateMessages = async (req, res) => {
  try {
    const myWallet = req.user.walletAddress;
    const { wallet } = req.params;

    if (!myWallet) {
      return res.status(401).json({
        success: false,
        message: "Authenticated wallet address is missing",
      });
    }

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Receiver wallet address is required",
      });
    }

    const myWalletLower = myWallet.toLowerCase();
    const otherWalletLower = wallet.toLowerCase();

    const messages = await Message.find({
      chatType: "PRIVATE",
      $or: [
        {
          senderWallet: myWalletLower,
          receiverWallet: otherWalletLower,
        },
        {
          senderWallet: otherWalletLower,
          receiverWallet: myWalletLower,
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
    console.error(
      "Get Private Messages Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while fetching private messages",
    });
  }
};


// ============================================================
// CREATE PRIVATE CHAT MESSAGE
// ============================================================

export const createPrivateMessage = async (req, res) => {
  try {
    const senderWallet = req.user.walletAddress;
    const { wallet } = req.params;

    const {
      senderName,
      senderAvatar,
      message,
    } = req.body;

    if (!senderWallet) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated wallet address is missing",
      });
    }

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message:
          "Receiver wallet address is required",
      });
    }

    if (!senderName || !message) {
      return res.status(400).json({
        success: false,
        message:
          "Sender name and message are required",
      });
    }

    const newMessage = await Message.create({
      senderWallet: senderWallet.toLowerCase(),
      senderName: senderName.trim(),
      senderAvatar: senderAvatar || "",
      message: message.trim(),
      chatType: "PRIVATE",
      receiverWallet: wallet.toLowerCase(),
    });

    const io = req.app.get("io");

    const senderRoom =
      `wallet:${senderWallet.toLowerCase()}`;

    const receiverRoom =
      `wallet:${wallet.toLowerCase()}`;

    io.to(senderRoom).emit(
      "new-private-message",
      newMessage
    );

    io.to(receiverRoom).emit(
      "new-private-message",
      newMessage
    );



    return res.status(201).json({
      success: true,
      message:
        "Private message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error(
      "Create Private Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating private message",
    });
  }
};


// ============================================================
// UPDATE PRIVATE CHAT MESSAGE
// ============================================================

export const updatePrivateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated wallet address is missing",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is required",
      });
    }

    const updatedMessage =
      await Message.findOneAndUpdate(
        {
          _id: id,
          chatType: "PRIVATE",
          senderWallet:
            walletAddress.toLowerCase(),
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
          "Message not found or you are not allowed to edit this message",
      });
    }

    const io = req.app.get("io");

    const senderRoom =
      `wallet:${updatedMessage.senderWallet.toLowerCase()}`;

    const receiverRoom =
      `wallet:${updatedMessage.receiverWallet.toLowerCase()}`;

    io.to(senderRoom).emit(
      "private-message-updated",
      updatedMessage
    );

    io.to(receiverRoom).emit(
      "private-message-updated",
      updatedMessage
    );

    return res.status(200).json({
      success: true,
      message:
        "Private message updated successfully",
      data: updatedMessage,
    });
  } catch (error) {
    console.error(
      "Update Private Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while updating private message",
    });
  }
};


// ============================================================
// DELETE PRIVATE CHAT MESSAGE
// ============================================================

export const deletePrivateMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return res.status(401).json({
        success: false,
        message:
          "Authenticated wallet address is missing",
      });
    }

    const deletedMessage =
      await Message.findOneAndDelete({
        _id: id,
        chatType: "PRIVATE",
        senderWallet:
          walletAddress.toLowerCase(),
      });

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message:
          "Message not found or you are not allowed to delete this message",
      });
    }

    const io = req.app.get("io");

    const senderRoom =
      `wallet:${deletedMessage.senderWallet.toLowerCase()}`;

    const receiverRoom =
      `wallet:${deletedMessage.receiverWallet.toLowerCase()}`;

    io.to(senderRoom).emit(
      "private-message-deleted",
      deletedMessage
    );

    io.to(receiverRoom).emit(
      "private-message-deleted",
      deletedMessage
    );

    return res.status(200).json({
      success: true,
      message:
        "Private message deleted successfully",
      data: deletedMessage,
    });
  } catch (error) {
    console.error(
      "Delete Private Message Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while deleting private message",
    });
  }
};

