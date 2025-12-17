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
    const now = Date.now();
    const folder = options.folder || 'uploads';
    return Promise.resolve({
      secure_url: `https://via.placeholder.com/640x480?text=${encodeURIComponent(folder)}`,
      public_id: `fallback_${now}`
    });
  }
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        const now = Date.now();
        const folder = options.folder || 'uploads';
        return resolve({
          secure_url: `https://via.placeholder.com/640x480?text=${encodeURIComponent(folder)}`,
          public_id: `fallback_${now}`
        });
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
    const now = Date.now();
    const folder = options.folder || 'uploads';
    return {
      secure_url: `https://via.placeholder.com/640x480?text=${encodeURIComponent(folder)}`,
      public_id: `fallback_${now}`
    };
  }
  try {
    const res = await cloudinary.uploader.upload(input, options);
    return res;
  } catch (_) {
    const now = Date.now();
    const folder = options.folder || 'uploads';
    return {
      secure_url: `https://via.placeholder.com/640x480?text=${encodeURIComponent(folder)}`,
      public_id: `fallback_${now}`
    };
  }
}

module.exports = {
  cloudinary,
  uploadFromBuffer,
  upload
};
