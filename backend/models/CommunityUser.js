import mongoose from "mongoose";

const communityUserSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    profileImage: {
      type: String,
      default: "",
    },

    dob: {
      type: Date,
      required: true,
    },

    isBanned: {
      type: Boolean,
      default: false,
      index: true,
    },

    banReason: {
      type: String,
      default: "",
      trim: true,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    bannedBy: {
      type: String,
      default: "",
    },

  },
  {
    timestamps: true,
  }
);

const CommunityUser = mongoose.model(
  "CommunityUser",
  communityUserSchema
);

export default CommunityUser;