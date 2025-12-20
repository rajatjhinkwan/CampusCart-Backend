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

function uploadFromBuffer(buffer, options = {}) {
  const configured = CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET;
  if (!configured) {
    // Reject so that controllers can fallback to base64 or other storage
    return Promise.reject(new Error("Cloudinary not configured"));
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        // Instead of resolving with placeholder, reject so controller can use base64 fallback
        return reject(error);
      }
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

async function upload(input, options = {}) {
  const configured = CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET;
  if (Buffer.isBuffer(input)) {
    return uploadFromBuffer(input, options);
  }
  if (!configured) {
    throw new Error("Cloudinary not configured");
  }
  try {
    const res = await cloudinary.uploader.upload(input, options);
    return res;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  cloudinary,
  uploadFromBuffer,
  upload
};
