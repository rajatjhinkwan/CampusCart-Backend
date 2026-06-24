// models/Job.js
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Job title is required"],
            trim: true,
            maxlength: [100, "Title cannot exceed 100 characters"],
        },
        description: {
            type: String,
            required: [true, "Job description is required"],
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        companyName: {
            type: String,
            required: [true, "Company name is required"],
            trim: true,
            maxlength: [100, "Company name cannot exceed 100 characters"],
        },
        location: {
            type: String,
            required: [true, "Location is required"],
            trim: true,
        },
        salary: {
            type: String, // Can be 'Negotiable', '10k-15k', etc.
            default: "Negotiable",
        },
        jobType: {
            type: String,
            enum: ["Part-Time", "Internship", "Full-Time"],
            required: [true, "Job type is required"],
        },
        duration: {
            type: String, // e.g., "3 months", "6 months", "Flexible"
            default: "Flexible",
        },
        skillsRequired: [
            {
                type: String,
                trim: true,
            },
        ],
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        applicantsCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true, // createdAt & updatedAt
    }
);

// Index for faster searches
jobSchema.index({
    title: "text",
    description: "text",
    companyName: "text",
    location: "text",
    tags: "text"
});

module.exports = mongoose.model("Job", jobSchema);
