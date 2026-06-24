const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    // Stores last message reference for previews
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // Context for negotiation (Product, Room, Service, Job)
    contextType: {
      type: String,
      enum: ["Product", "Room", "Service", "Job"],
      default: null
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "contextType",
      default: null
    },
  },
  { timestamps: true }
);

// ⭐ Index: speeds up searching conversations between two users
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
