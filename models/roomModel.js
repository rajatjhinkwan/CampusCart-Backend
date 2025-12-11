// models/RoomModel.js
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
    {
        // ------------------------------
        // BASIC INFO
        // ------------------------------
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },

        // ------------------------------
        // RENT DETAILS
        // ------------------------------
        rent: { type: Number, required: true },
        securityDeposit: { type: Number, default: 0 },

        // ------------------------------
        // LOCATION DETAILS
        // ------------------------------
        location: {
            city: { type: String, required: true, trim: true },
            area: { type: String, required: true, trim: true }
        },
        address: { type: String, trim: true },

        // ------------------------------
        // ROOM OWNER / SELLER
        // ------------------------------
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        // ------------------------------
        // IMAGES
        // ------------------------------
        images: [
            {
                url: { type: String, required: true },  // mandatory url
                public_id: { type: String },           // optional cloudinary id
            },
        ],

        // ------------------------------
        // ROOM TYPE
        // ------------------------------
        roomType: {
            type: String,
            enum: [
                "Single Room",
                "Double Room",
                "1BHK",
                "2BHK",
                "Hostel Bed",
                "PG",
                "Short-Term Stay",
                "Other",
            ],
            default: "Single Room",
        },

        bhk: { type: Number, min: 1 }, // Only for flats, numeric validation

        // ------------------------------
        // FURNISHING
        // ------------------------------
        furnished: {
            type: String,
            enum: ["Furnished", "Semi-Furnished", "Unfurnished"],
            default: "Semi-Furnished",
        },

        // ------------------------------
        // AVAILABILITY
        // ------------------------------
        availableFrom: { type: Date },

        // ------------------------------
        // ROOM FEATURES
        // ------------------------------
        features: {
            attachedBathroom: { type: Boolean, default: false },
            attachedToilet: { type: Boolean, default: false },
            attachedKitchen: { type: Boolean, default: false },

            // Furniture
            bed: { type: Boolean, default: false },
            mattress: { type: Boolean, default: false },
            studyTable: { type: Boolean, default: false },
            chair: { type: Boolean, default: false },
            cupboard: { type: Boolean, default: false },

            // Utilities
            fan: { type: Boolean, default: false },
            geyser: { type: Boolean, default: false },
            fridge: { type: Boolean, default: false },
            wifi: { type: Boolean, default: false },

            // Other amenities
            parkingAvailable: { type: Boolean, default: false },
            balcony: { type: Boolean, default: false },
            electricityIncluded: { type: Boolean, default: false },
            waterIncluded: { type: Boolean, default: true },
        },

        // ------------------------------
        // RULES
        // ------------------------------
        rules: {
            noSmoking: { type: Boolean, default: false },
            noAlcohol: { type: Boolean, default: false },
            noPets: { type: Boolean, default: false },
            oppositeGenderAllowed: { type: Boolean, default: true },
            timingRestrictions: { type: Boolean, default: false },
        },

        // ------------------------------
        // CONTACT
        // ------------------------------
        contactNumber: { type: String, required: true, trim: true },

        // ------------------------------
        // STATUS & METRICS
        // ------------------------------
        isActive: { type: Boolean, default: true },
        views: { type: Number, default: 0 },

        // ------------------------------
        // TAGS FOR FAST SEARCH
        // ------------------------------
        tags: { type: [String], default: [] },
    },
    { timestamps: true }
);

// ------------------------------
// INDEXES FOR SEARCH & FILTER
// ------------------------------
roomSchema.index({ "location.city": "text", "location.area": "text", title: "text", description: "text", tags: "text" });
roomSchema.index({ rent: 1 });
roomSchema.index({ roomType: 1 });

module.exports = mongoose.model("Room", roomSchema);
