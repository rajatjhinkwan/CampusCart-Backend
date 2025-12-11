// controllers/serviceController.js
const Service = require("../models/serviceModel");
const { uploadFromBuffer } = require("../config/cloudinary");

// ------------------------------
// CREATE SERVICE
// ------------------------------
exports.createService = async (req, res) => {
    try {
        // Validation checks
        if (!req.body.description || req.body.description.length < 10) {
            return res.status(400).json({
                success: false,
                message: "Description must be at least 10 characters long."
            });
        }

        const category = req.body.serviceType || req.body.category || 'Other';
        const phone = req.body.contactNumber || req.body.phone || (req.user && req.user.phone) || '';

        let location = req.body.location;
        try { if (typeof location === 'string') location = JSON.parse(location); } catch {}

        const price = req.body.rate !== undefined ? Number(req.body.rate) : Number(req.body.price);

        let images = [];
        if (req.files && req.files.length > 0) {
            const uploads = await Promise.all(
                req.files.map((file) => uploadFromBuffer(file.buffer, { folder: 'services' }))
            );
            images = uploads.map(u => u.secure_url);
        }

        const payload = {
            title: req.body.title,
            description: req.body.description,
            category,
            customCategory: req.body.customCategory,
            price,
            location: location || undefined,
            images: images.length ? images : (Array.isArray(req.body.images) ? req.body.images : []),
            provider: req.user.id,
            phone,
        };

        const service = await Service.create(payload);

        res.status(201).json({
            success: true,
            message: "Service created successfully",
            data: service,
        });
    } catch (err) {
        console.error("CREATE SERVICE ERROR:", err);
        res.status(500).json({ success: false, message: err.message || "Server Error" });
    }
};

// ------------------------------
// GET ALL SERVICES (Filters + Pagination)
// ------------------------------
exports.getAllServices = async (req, res) => {
    try {
        const { category, city, minPrice, maxPrice } = req.query;

        let query = {};

        if (category) query.category = category;
        if (city) query["location.city"] = city;
        if (minPrice || maxPrice)
            query.price = {
                ...(minPrice && { $gte: Number(minPrice) }),
                ...(maxPrice && { $lte: Number(maxPrice) }),
            };

        const services = await Service.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: services.length,
            data: services,
        });
    } catch (err) {
        console.error("GET SERVICES ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ------------------------------
// GET SINGLE SERVICE
// ------------------------------
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        res.status(200).json({ success: true, data: service });
    } catch (err) {
        console.error("GET SINGLE SERVICE ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ------------------------------
// DELETE SERVICE (only owner)
// ------------------------------
exports.deleteService = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        // Ensure only owner can delete
        if (service.provider.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this service",
            });
        }

        await Service.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (err) {
        console.error("DELETE SERVICE ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
