// config/cloudinary.js
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn('Cloudinary env variables are not fully set. Uploads will fail if used without proper config.');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a buffer (from multer memoryStorage) to Cloudinary.
 * @param {Buffer} buffer
 * @param {Object} options - cloudinary uploader options (folder, public_id, transformation, etc)
 * @returns {Promise<Object>} - cloudinary response
 */
function uploadFromBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

module.exports = {
  cloudinary,
  uploadFromBuffer
};
