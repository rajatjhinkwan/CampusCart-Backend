const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true, lowercase: true },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false              // password hidden by default
    },

    avatar: { type: String, default: "" }, // Cloudinary URL

    phone: { type: String },

    username: { type: String, trim: true },

    bio: { type: String, default: "" },

    location: { type: String, default: "" },

    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer"
    },

    // ⭐ Wishlist (Products liked by user)
    wishlist: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" }
    ],

    // ⭐ Products posted by user for selling
    listings: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" }
    ],

    // ⭐ Notifications for user
    notifications: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Notification" }
    ],

    /* ----------------------------------------------------------
       EXTRA FEATURES
       ---------------------------------------------------------- */

    // 👁️ Profile visit count
    profileViews: {
      type: Number,
      default: 0,
    },

    // 📩 Number of unread messages
    unreadMessages: {
      type: Number,
      default: 0,
    },

    // 💰 Total successful sales
    totalSales: {
      type: Number,
      default: 0,
    },

    // 🔎 Saved searches that store product results
    savedSearches: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product" }
    ],

    // ⚙️ User settings stored in a single object
    settings: {
      notifications: {
        newMessage: { type: Boolean, default: true },
        productSold: { type: Boolean, default: true },
        priceDrop: { type: Boolean, default: false },
        newOffer: { type: Boolean, default: true },
        appUpdates: { type: Boolean, default: false },
      },
      privacy: {
        profileVisible: { type: Boolean, default: true },
        activityStatus: { type: Boolean, default: true },
        searchEngineListing: { type: Boolean, default: false },
        dataDownload: { type: Boolean, default: false },
        personalizedAds: { type: Boolean, default: true },
      },
      preferences: {
        darkMode: { type: Boolean, default: false },
        compactView: { type: Boolean, default: false },
        autoPlayVideos: { type: Boolean, default: true },
        language: { type: String, default: "English" },
      },
      selling: {
        autoRenewListings: { type: Boolean, default: true },
        enableOfferRequests: { type: Boolean, default: true },
        promoteListings: { type: Boolean, default: false },
      },
      security: {
        twoFactorEnabled: { type: Boolean, default: false },
      },
    }
  },
  { timestamps: true }
);

// ==================================================
// 🧠 Hash password before saving (only when changed)
// ==================================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // if password not changed → skip
  const salt = await bcrypt.genSalt(10); // generate salt for security
  this.password = await bcrypt.hash(this.password, salt); // hash the password
  next();
});

// ==================================================
// 🔐 Compare entered password with hashed one
// ==================================================
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ==================================================
// 🧾 Export model
// ==================================================
module.exports = mongoose.model("User", userSchema);
