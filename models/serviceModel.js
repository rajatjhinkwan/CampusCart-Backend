// models/serviceModel.js
const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Service title is required"],
            trim: true,
        },

        description: {
            type: String,
            required: [true, "Service description is required"],
            minlength: 10,
        },

        category: {
            type: String,
            required: true,
            default: "Other",
        },

        customCategory: {
            type: String,
            default: "",
        },


        price: {
            type: Number,
            required: [true, "Price is required"],
            min: 0,
        },

        location: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        images: {
            type: [String], // Cloudinary URLs
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "At least one service image is required",
            },
        },

        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        phone: {
            type: String,
            required: false,
        },

        isAvailable: {
            type: Boolean,
            default: true,
        },

        rating: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Service", serviceSchema);
