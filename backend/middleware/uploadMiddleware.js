
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

// Assumes this file is inside backend/middleware/
// and uploads/ is inside the backend root directory.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDirectory = path.resolve(__dirname, "../uploads");

// Create uploads folder automatically if it does not exist.
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// ============================================================
// FILE STORAGE
// ============================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const safeName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);

    const uniqueName = `${Date.now()}-${safeName}${extension}`;

    cb(null, uniqueName);
  },
});

// ============================================================
// ALLOWED DOCUMENT TYPES
// ============================================================

const allowedExtensions = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".rtf",
  ".odt",
  ".ods",
]);

// ============================================================
// FILE VALIDATION
// ============================================================

const fileFilter = (req, file, cb) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return cb(
      new Error(
        "This document file type is not allowed. Please select a supported document."
      )
    );
  }

  cb(null, true);
};

// ============================================================
// MULTER CONFIGURATION
// ============================================================


const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // Maximum file size: 10 MB
    files: 1,
    fields: 10, // Maximum number of non-file fields
    fieldSize: 256 * 1024, // Maximum text field size: 256 KB
    parts: 12, // Maximum total multipart parts
  },
});




export default upload;

