import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
      maxlength: 150,
    },

    content: {
      type: String,
      required: [true, "Announcement content is required"],
      trim: true,
      maxlength: 10000,
    },

    info: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },

    priority: {
      type: String,
      enum: ["NORMAL", "IMPORTANT", "URGENT"],
      default: "NORMAL",
    },

    isPublished: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Announcement = mongoose.model(
  "Announcement",
  announcementSchema
);

export default Announcement;