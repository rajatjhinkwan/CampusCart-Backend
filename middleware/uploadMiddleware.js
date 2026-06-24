const multer = require("multer");
const path = require("path");

// memory storage is handy when you want to upload to Cloudinary in controller.
const storage = multer.memoryStorage();

// file filter: allow common image types only (jpg, jpeg, png, webp)
function imageFileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp/;
  const mimetype = allowed.test(file.mimetype);
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"));
}

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit (matches frontend copy)
  },
  fileFilter: imageFileFilter,
});

module.exports = upload;
