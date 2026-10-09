import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    // Stable application-level admin ID
    adminId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Admin login username
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    // Hashed password
    passwordHash: {
      type: String,
      required: true,
    },

    // Admin role
    role: {
      type: String,
      enum: ["ADMIN"],
      default: "ADMIN",
    },

    // Allows us to disable an admin later
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;