// config/multerConfig.js
const multer = require('multer');

/**
 * We use memoryStorage so we can push files to Cloudinary (or any remote storage)
 * via stream (avoid temporary local disk files). If you prefer local storage,
 * swap for diskStorage.
 */
const storage = multer.memoryStorage();

/**
 * File filter - only images (jpeg/png/webp/gif).
 * Adjust mime types as needed (e.g., allow video/* if you need video uploads).
 */
const imageFileFilter = (req, file, cb) => {
  const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMime.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only image files are allowed.'), false);
  }
};

/**
 * Create multer instance with sensible defaults.
 * maxSizeBytes example = 5MB
 */
function createMulter({
  limits = { fileSize: 5 * 1024 * 1024 }, // 5MB default
  fileFilter = imageFileFilter,
  storageEngine = storage
} = {}) {
  return multer({
    storage: storageEngine,
    limits,
    fileFilter
  });
}

// Export helpers for common use-cases
const uploader = createMulter();

/**
 * Examples to use in routes/controllers:
 * uploader.single('image')         // single file upload
 * uploader.array('images', 5)      // up to 5 files under field 'images'
 * uploader.fields([{ name: 'images', maxCount: 5 }, { name: 'thumbnail', maxCount: 1 }])
 */

module.exports = {
  createMulter,
  uploader
};
