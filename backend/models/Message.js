import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
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

    message: {
      type: String,
      required: true,
      trim: true,
    },

    chatType: {
      type: String,
      enum: ["GROUP", "PRIVATE"],
      default: "GROUP",
    },

    receiverWallet: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;