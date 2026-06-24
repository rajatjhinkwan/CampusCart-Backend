// models/requestModel.js
const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Request title is required"],
            trim: true,
            maxlength: [100, "Title cannot exceed 100 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },
        location: {
            type: String,
            required: [true, "Location is required"],
            trim: true,
        },
        budget: {
            type: String, // e.g. "500-1000", "Negotiable"
            default: "Negotiable",
        },
        urgency: {
            type: String,
            enum: ["Low", "Medium", "High", "Urgent"],
            default: "Medium",
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["Open", "Closed", "Fulfilled"],
            default: "Open",
        },
    },
    {
        timestamps: true,
    }
);

// Index for search
requestSchema.index({
    title: "text",
    description: "text",
    category: "text",
    location: "text",
});

module.exports = mongoose.model("Request", requestSchema);
