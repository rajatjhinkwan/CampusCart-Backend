const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["message", "wishlist", "sale", "report", "review"],
      required: true,
    },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    link: { type: String }, // e.g. product link
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);