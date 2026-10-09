import jwt from "jsonwebtoken";

const adminAuthMiddleware = (req, res, next) => {
  try {
    // --------------------------------------------------------
    // Get Authorization header
    // --------------------------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Admin authentication token is required",
      });
    }

    // --------------------------------------------------------
    // Expected format:
    // Authorization: Bearer TOKEN
    // --------------------------------------------------------

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];

    // --------------------------------------------------------
    // Verify JWT
    // --------------------------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // --------------------------------------------------------
    // Make sure this is an ADMIN token
    // --------------------------------------------------------

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // --------------------------------------------------------
    // Make sure adminId exists
    // --------------------------------------------------------

    if (!decoded.adminId) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin identity",
      });
    }

    // --------------------------------------------------------
    // Attach admin information to request
    // --------------------------------------------------------

    req.admin = {
      adminId: decoded.adminId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("Admin Auth Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin authentication token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid admin authentication token",
    });
  }
};

export default adminAuthMiddleware;