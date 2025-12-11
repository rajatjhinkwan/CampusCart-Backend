// FILE: models/messageModel.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // ⭐ required to track unread messages properly
    },

    content: {
      type: String,
      required: true,
    },

    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    attachments: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
