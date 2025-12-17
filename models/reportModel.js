const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetType: { type: String, enum: ['product', 'room', 'service', 'job', 'user'], required: true },
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

reportSchema.index({ reporter: 1, product: 1 }, { unique: true, partialFilterExpression: { product: { $type: 'objectId' } } });
reportSchema.index({ reporter: 1, room: 1 }, { unique: true, partialFilterExpression: { room: { $type: 'objectId' } } });
reportSchema.index({ reporter: 1, service: 1 }, { unique: true, partialFilterExpression: { service: { $type: 'objectId' } } });
reportSchema.index({ reporter: 1, job: 1 }, { unique: true, partialFilterExpression: { job: { $type: 'objectId' } } });
reportSchema.index({ reporter: 1, user: 1 }, { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } });

module.exports = mongoose.model('Report', reportSchema);
