
import mongoose from "mongoose";
import Announcement from "../models/Announcement.js";

// ============================================================
// GET PUBLISHED ANNOUNCEMENTS — COMMUNITY MEMBERS
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
    console.error("Get announcements error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch announcements",
    });
  }
};

// ============================================================
// GET ALL ANNOUNCEMENTS — ADMIN
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
      message: "Failed to fetch announcements",
    });
  }
};

// ============================================================
// CREATE ANNOUNCEMENT — ADMIN
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
        message: "Title and content are required",
      });
    }

    const normalizedPriority = String(priority).toUpperCase();

    if (
      !["NORMAL", "IMPORTANT", "URGENT"].includes(
        normalizedPriority
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement priority",
      });
    }

    if (typeof isPublished !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isPublished must be true or false",
      });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      info: typeof info === "string" ? info.trim() : "",
      priority: normalizedPriority,
      isPublished,
      createdBy: String(req.admin.adminId),
    });

    // Notify connected members about a newly published announcement.
    if (announcement.isPublished) {
      const io = req.app.get("io");

      if (io) {
        io.emit("announcement:new", announcement);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("Create announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create announcement",
    });
  }
};

// ============================================================
// UPDATE ANNOUNCEMENT — ADMIN
// PUT /api/admin/announcements/:id
// ============================================================

export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, info, priority, isPublished } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID",
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        !title.trim() ||
        title.trim().length > 150
      ) {
        return res.status(400).json({
          success: false,
          message: "Title must contain 1–150 characters",
        });
      }

      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (
        typeof content !== "string" ||
        !content.trim() ||
        content.trim().length > 10000
      ) {
        return res.status(400).json({
          success: false,
          message: "Content must contain 1–10000 characters",
        });
      }

      updates.content = content.trim();
    }

    if (priority !== undefined) {
      const normalizedPriority = String(priority).toUpperCase();

      if (
        !["NORMAL", "IMPORTANT", "URGENT"].includes(
          normalizedPriority
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid announcement priority",
        });
      }

      updates.priority = normalizedPriority;
    }

    if (isPublished !== undefined) {
      if (typeof isPublished !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isPublished must be true or false",
        });
      }

      updates.isPublished = isPublished;
    }

    if (info !== undefined) {
      if (
        typeof info !== "string" ||
        info.trim().length > 300
      ) {
        return res.status(400).json({
          success: false,
          message: "Info must contain no more than 300 characters",
        });
      }

      updates.info = info.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
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
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error("Update announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update announcement",
    });
  }
};

// ============================================================
// DELETE ANNOUNCEMENT — ADMIN
// DELETE /api/admin/announcements/:id
// ============================================================

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid announcement ID",
      });
    }

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: "Announcement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Delete announcement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete announcement",
    });
  }
};
