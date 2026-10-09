
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // ========================================================
    // SENDER DETAILS
    // ========================================================

    senderWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
    },

    senderAvatar: {
      type: String,
      default: "",
    },

    // ========================================================
    // MESSAGE TEXT
    // Required: false so a document can be sent without text.
    // ========================================================

    message: {
      type: String,
      default: "",
      trim: true,
    },

    // ========================================================
    // EDIT STATUS
    // ========================================================

    isEdited: {
      type: Boolean,
      default: false,
    },

    // ========================================================
    // CHAT TYPE
    // ========================================================

    chatType: {
      type: String,
      enum: ["GROUP", "PRIVATE"],
      default: "GROUP",
    },

    // ========================================================
    // PRIVATE MESSAGE RECIPIENT
    // ========================================================

    receiverWallet: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },

    // ========================================================
    // DOCUMENT ATTACHMENT
    // ========================================================

    attachment: {
      type: {
        originalName: {
          type: String,
          required: true,
        },

        fileName: {
          type: String,
          required: true,
        },

        url: {
          type: String,
          required: true,
        },

        mimeType: {
          type: String,
          default: "application/octet-stream",
        },

        size: {
          type: Number,
          default: 0,
        },
      },

      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;

