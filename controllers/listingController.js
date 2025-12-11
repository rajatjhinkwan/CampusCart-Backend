const Listing = require("../models/Listing");

// CREATE LISTING
exports.createListing = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            subCategory,
            price,
            location,
            roomDetails,
            serviceDetails,
            jobDetails,
            condition,
            images,
        } = req.body;

        const listing = await Listing.create({
            title,
            description,
            category,
            subCategory,
            price,
            location,
            roomDetails,
            serviceDetails,
            jobDetails,
            condition,
            images,
            seller: req.user.id,
        });

        res.status(201).json({
            success: true,
            listing,
        });
    } catch (error) {
        console.error("Error creating listing:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.getAllListings = async (req, res) => {
    try {
        const { category, subCategory, minPrice, maxPrice } = req.query;

        const filter = {};

        if (category) filter.category = category;
        if (subCategory) filter.subCategory = subCategory;

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        const listings = await Listing.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: listings.length,
            listings,
        });
    } catch (error) {
        console.error("Error fetching listings:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.getListingById = async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id).populate("seller");

        if (!listing)
            return res.status(404).json({ success: false, message: "Not found" });

        // increase views
        listing.views += 1;
        await listing.save();

        res.status(200).json({ success: true, listing });
    } catch (error) {
        console.error("Error fetching listing:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.deleteListing = async (req, res) => {
    try {
        const listing = await Listing.findById(req.params.id);

        if (!listing)
            return res.status(404).json({ success: false, message: "Not found" });

        if (listing.seller.toString() !== req.user.id)
            return res.status(403).json({
                success: false,
                message: "Not allowed",
            });

        await listing.deleteOne();

        res.status(200).json({ success: true, message: "Listing deleted" });
    } catch (error) {
        console.error("Error deleting listing:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};


exports.updateListing = async (req, res) => {
    try {
        const updated = await Listing.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.status(200).json({ success: true, updated });
    } catch (error) {
        console.error("Error updating listing:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
