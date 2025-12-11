const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // ✅ this field must exist
    reason: { type: String, required: true },
    message: { type: String },
    status: {
      type: String,
      enum: ['Pending', 'Removed', 'Ignored'],
      default: 'Pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
