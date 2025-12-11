// testUpload.js
require('dotenv').config();
const express = require('express');
const { uploader } = require('./config/multerConfig');
const { uploadFromBuffer } = require('./config/cloudinary');

const app = express();

// 👇 Simple POST route to test image upload
app.post('/test-upload', uploader.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload file buffer to Cloudinary
    const result = await uploadFromBuffer(req.file.buffer, {
      folder: 'test_uploads', // optional: creates folder in Cloudinary
    });

    res.json({
      message: '✅ Image uploaded successfully!',
      cloudinaryUrl: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('❌ Upload failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the test server
const PORT = process.env.PORT || 3200;
app.listen(PORT, () => console.log(`🚀 Test server running at http://localhost:${PORT}`));
