const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },

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
    views: { type: Number, default: 0 },


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
