// models/tokenModel.js
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    token: {
      type: String,
      required: true,
      unique: true, // ✅ Prevent duplicate tokens
    },
    purpose: {
      type: String,
      enum: ['passwordReset', 'emailVerification', 'refreshToken'],
      required: true, // ✅ make it required
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // ✅ optional: auto delete after 7 days
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Token', tokenSchema);
