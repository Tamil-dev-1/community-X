
import mongoose from "mongoose";
import Announcement from "../models/Announcement.js";

// ============================================================
// GET PUBLISHED ANNOUNCEMENTS — MEMBER SIDE
// GET /api/announcements
// ============================================================

export const getPublishedAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({
      isPublished: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    console.error("Get published announcements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load announcements.",
    });
  }
};

// ============================================================
// GET ALL ANNOUNCEMENTS — ADMIN SIDE
// GET /api/admin/announcements
// ============================================================

export const getAdminAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    console.error("Get admin announcements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load admin announcements.",
    });
  }
};

// ============================================================
// CREATE ANNOUNCEMENT — ADMIN SIDE
// POST /api/admin/announcements
// ============================================================

export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      info = "",
      priority = "NORMAL",
      isPublished = true,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required.",
      });
    }

    if (!["NORMAL", "IMPORTANT", "URGENT"].includes(priority)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement priority.",
      });
    }

    if (typeof isPublished !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isPublished must be a boolean.",
      });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      info: typeof info === "string" ? info.trim() : "",
      priority,
      isPublished,
      createdBy: String(req.admin.adminId),
    });

    const io = req.app.get("io");

    if (announcement.isPublished && io) {
      io.emit("announcement:new", announcement);
    }

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully.",
      announcement,
    });
  } catch (error) {
    console.error("Create announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create announcement.",
    });
  }
};

// ============================================================
// UPDATE ANNOUNCEMENT — ADMIN SIDE
// PUT /api/admin/announcements/:id
// ============================================================

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID.",
      });
    }

    const allowedFields = [
      "title",
      "content",
      "info",
      "priority",
      "isPublished",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for updating.",
      });
    }

    if (
      "title" in updates &&
      (typeof updates.title !== "string" || !updates.title.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Title cannot be empty.",
      });
    }

    if (
      "content" in updates &&
      (typeof updates.content !== "string" ||
        !updates.content.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Content cannot be empty.",
      });
    }

    if (
      "info" in updates &&
      typeof updates.info !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Info must be a string.",
      });
    }

    if (
      "priority" in updates &&
      !["NORMAL", "IMPORTANT", "URGENT"].includes(updates.priority)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement priority.",
      });
    }

    if (
      "isPublished" in updates &&
      typeof updates.isPublished !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "isPublished must be a boolean.",
      });
    }

    if ("title" in updates) {
      updates.title = updates.title.trim();
    }

    if ("content" in updates) {
      updates.content = updates.content.trim();
    }

    if ("info" in updates) {
      updates.info = updates.info.trim();
    }

    const announcement = await Announcement.findByIdAndUpdate(
      id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found.",
      });
    }

    const io = req.app.get("io");

    // Notify connected clients about edits and publication changes.
    if (io) {
      io.emit("announcement:updated", announcement);
    }

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully.",
      announcement,
    });
  } catch (error) {
    console.error("Update announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update announcement.",
    });
  }
};

// ============================================================
// DELETE ANNOUNCEMENT — ADMIN SIDE
// DELETE /api/admin/announcements/:id
// ============================================================

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID.",
      });
    }

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found.",
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("announcement:deleted", {
        id: String(announcement._id),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully.",
      id: String(announcement._id),
    });
  } catch (error) {
    console.error("Delete announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement.",
    });
  }
};
