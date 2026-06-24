const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["product", "room", "service", "job", "message", "system"],
      required: true,
    },
    event: {
      type: String,
      enum: ["created", "updated", "sold", "offer", "price_drop", "applied", "accepted", "rejected", "message", "general"],
      default: "general",
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    link: { type: String, default: "" },
    isRead: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
