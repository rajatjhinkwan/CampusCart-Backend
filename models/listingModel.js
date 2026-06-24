const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },

        // Main category: Product, Service, Room, Internship
        category: { type: String, required: true },

        // Like Laptops, Single Room, Video Editing, Graphic Design Intern
        subCategory: { type: String, required: true },

        price: { type: Number },

        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        images: [
            {
                url: String,
                public_id: String,
            },
        ],

        location: { type: String },

        // ROOM DETAILS
        roomDetails: {
            roomType: String,
            furnished: Boolean,
            bhk: Number,
            availableFrom: Date,
            attachedBath: Boolean,
        },

        // SERVICE DETAILS
        serviceDetails: {
            rateType: { type: String, enum: ["Hourly", "Project", "Monthly"] },
            skills: [String],
            experience: String,
        },

        // JOB / INTERNSHIP DETAILS
        jobDetails: {
            stipend: Number,
            duration: String,
            workType: { type: String, enum: ["Remote", "Onsite", "Hybrid"] },
            requiredSkills: [String],
        },

        condition: {
            type: String,
            enum: ["New", "Used", "Like New"],
            default: "Used",
        },

        views: { type: Number, default: 0 },
        isSold: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Listing", listingSchema);
