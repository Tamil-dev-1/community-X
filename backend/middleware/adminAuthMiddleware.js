
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const adminAuthMiddleware = async (req, res, next) => {
  try {
    // 1. Require the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication token is required",
      });
    }

    // 2. Validate Bearer token format
    const parts = authHeader.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    // 3. Require the backend JWT secret
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured",
      });
    }

    // 4. Verify token signature and expiration
    const decoded = jwt.verify(
      parts[1],
      process.env.JWT_SECRET
    );

    // 5. Confirm this is an admin token
    if (
      !decoded ||
      typeof decoded !== "object" ||
      decoded.role !== "ADMIN" ||
      typeof decoded.adminId !== "string" ||
      !decoded.adminId.trim()
    ) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // 6. Verify the admin still exists and is active
    const admin = await Admin.findOne({
      adminId: decoded.adminId.trim().toUpperCase(),
      isActive: true,
      role: "ADMIN",
    }).select("adminId username role isActive");

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive or no longer exists",
      });
    }

    // 7. Attach trusted database identity to the request
    req.admin = {
      adminId: admin.adminId,
      username: admin.username,
      role: admin.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin authentication token has expired",
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin authentication token",
      });
    }

    console.error("Admin Auth Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify admin authentication",
    });
  }
};

export default adminAuthMiddleware;
