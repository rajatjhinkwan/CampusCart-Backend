// models/rideModel.js
const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      // [lng, lat] – **order matters**
      type: [Number],
      required: true
    }
  },
  { _id: false } // we never need a separate _id for the point
);

const rideSchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // ── FROM ────────────────────────
    from: {
      address: { type: String, required: true },
      // keep raw lat/lng for easy display (virtuals could be used but we store them)
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      location: { type: pointSchema, required: true, index: '2dsphere' }
    },

    // ── TO ──────────────────────────
    to: {
      address: { type: String, required: true },
      lat: { type: Number, required: true, min: -90, max: 90 },
      lng: { type: Number, required: true, min: -180, max: 180 },
      location: { type: pointSchema, required: true, index: '2dsphere' }
    },

    seatsRequested: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },

    status: {
      type: String,
      enum: ['OPEN', 'ASSIGNED', 'ON_ROUTE', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN'
    },

    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    distanceKm: Number,
    estimatedDurationMins: Number,
    actualDurationMins: Number,

    // timestamps (createdAt/updatedAt) are added automatically
    assignedAt: Date,
    completedAt: Date,
    cancelledAt: Date
  },
  { timestamps: true }
);

/* ── Quick indexes for the most common queries ── */
rideSchema.index({ status: 1, createdAt: -1 });
rideSchema.index({ 'from.location': '2dsphere' });

module.exports = mongoose.model('Ride', rideSchema);
