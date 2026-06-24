const mongoose = require('mongoose');

const transportSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
    // Route Details
    from: {
      city: { type: String, required: true },
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },
    to: {
      city: { type: String, required: true },
      address: { type: String },
      lat: { type: Number },
      lng: { type: Number }
    },

    // Timing
    departureTime: { type: String, required: true }, // e.g., "10:00 AM"
    frequency: { 
      type: String, 
      enum: ['Daily', 'One-time', 'Weekly'], 
      default: 'One-time' 
    },
    departureDate: { type: Date }, // Required if frequency is One-time

    // Vehicle Details
    vehicleName: { type: String, required: true }, // e.g., "Mahindra Bolero"
    vehicleType: { 
      type: String, 
      enum: ['Car', 'Bus', 'Taxi', 'Bike', 'Auto', 'Truck'], 
      required: true 
    },
    vehicleNumber: { type: String }, // Optional for privacy, but good for verification
    seatsAvailable: { type: Number, required: true, default: 4 },
    
    // Pricing
    price: { type: Number, required: true }, // Per person/seat

    // Media
    images: [{
      url: { type: String, required: true },
      public_id: String
    }],

    description: { type: String },

    status: {
      type: String,
      enum: ['Active', 'Full', 'Expired', 'Cancelled'],
      default: 'Active'
    }
  },
  { timestamps: true }
);

// Index for search
transportSchema.index({ 'from.city': 'text', 'to.city': 'text' });
transportSchema.index({ 'from.lat': 1, 'from.lng': 1 });

module.exports = mongoose.model('Transport', transportSchema);
