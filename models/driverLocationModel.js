// models/driverLocationModel.js
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
      type: [Number],
      required: true // [lng, lat]
    }
  },
  { _id: false }
);

const driverLocationSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // one doc per driver
  },
  location: { type: pointSchema, required: true, index: '2dsphere' },
  speed: { type: Number, default: 0 },
  heading: Number,
  accuracy: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DriverLocation', driverLocationSchema);
