const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

    // 🆕 RENTAL / SELL OPTION
    type: { type: String, enum: ["sell", "rent"], default: "sell" },
    rentalPrice: { type: Number, default: 0 }, // Price per period
    rentalPeriod: { type: String, enum: ["Daily", "Weekly", "Monthly"], default: "Monthly" },
    minRentalDuration: { type: Number, default: 1 }, // e.g. 1 month
    securityDeposit: { type: Number, default: 0 },
    buyBackAvailable: { type: Boolean, default: false }, // "Buy Back" Guarantee
    buyBackPrice: { type: Number, default: 0 },

    condition: { type: String, enum: ["New", "Used", "Like New"], default: "Used" },

    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true }
      }
    ],

    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    location: { type: String },
    isSold: { type: Boolean, default: false },
    soldAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    
    // ⭐ Ratings (Calculated from Review collection)
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    environment: {
      savedCo2Kg: { type: Number, default: 0 },
      avoidedWasteKg: { type: Number, default: 0 },
      harmNewKg: { type: Number, default: 0 },
      harmAvoidedKg: { type: Number, default: 0 },
    },


    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],

    reports: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
