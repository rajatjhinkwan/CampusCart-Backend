const mongoose = require("mongoose");

/**
 * Category Schema
 * - Handles main categories and subcategories
 * - Supports multiple types: product, room, service, job
 * - Can store icons, description, color for UI display
 * - Count field can track number of listings in this category
 */

const categorySchema = new mongoose.Schema(
  {
    // Name of the category (unique)
    title: {
      type: String,
      required: [true, "Category title is required"],
      unique: true,
      trim: true,
    },

    // Icon (e.g., FontAwesome class, SVG name, or image URL)
    icon: {
      type: String,
      required: [true, "Category icon is required"],
    },

    // Optional description for category (UI display or SEO)
    desc: {
      type: String,
      default: "",
    },

    // Optional color for frontend display (e.g., "#2563EB")
    color: {
      type: String,
      default: "#000000",
    },

    // Main type: product, room, service, job
    type: {
      type: String,
      enum: ["product", "room", "service", "job"],
      required: [true, "Category type is required"],
    },

    // Parent category ID (null if main category)
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    // Count of listings in this category
    count: {
      type: Number,
      default: 0,
    },

    // Optional: for marking popular categories or featured ones
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Optional: auto-increment count when new listing is added
categorySchema.methods.incrementCount = async function () {
  this.count += 1;
  await this.save();
};

// Optional: auto-decrement count when a listing is removed
categorySchema.methods.decrementCount = async function () {
  if (this.count > 0) {
    this.count -= 1;
    await this.save();
  }
};

// Indexing for faster queries by type and parent
categorySchema.index({ type: 1, parent: 1 });

module.exports = mongoose.model("Category", categorySchema);
