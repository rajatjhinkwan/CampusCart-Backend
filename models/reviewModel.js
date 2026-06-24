const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // fixed: renamed from reviewer → user
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    room: { type: mongoose.Schema.Types.ObjectId, ref: "Room" },
    rating: { type: Number, min: 1, max: 5, required: true },
    text: { type: String }, // renamed from comment → text (to match controller)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
