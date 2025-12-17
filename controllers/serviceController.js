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
        try { if (typeof location === 'string') location = JSON.parse(location); } catch { }

        const price = req.body.rate !== undefined ? Number(req.body.rate) : Number(req.body.price);

        let images = [];
        if (req.files && req.files.length > 0) {
            try {
                const uploads = await Promise.all(
                    req.files.map((file) => uploadFromBuffer(file.buffer, { folder: 'services' }))
                );
                images = uploads.map(u => u.secure_url);
            } catch (e) {
                images = req.files.map((file) => {
                    const b64 = file.buffer.toString("base64");
                    return `data:${file.mimetype};base64,${b64}`;
                });
            }
        } else {
            images = ["https://via.placeholder.com/512x512.png?text=Service"];
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

        const services = await Service.find(query)
            .sort({ createdAt: -1 })
            .populate("provider", "name email avatar");

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
// FILTER SERVICES (Advanced Filters)
// ------------------------------
exports.filterServices = async (req, res) => {
    try {
        const { category, city, minPrice, maxPrice, search } = req.query;

        let query = {};

        if (category) query.category = category;
        if (city) query["location.city"] = { $regex: city, $options: "i" };
        if (minPrice || maxPrice)
            query.price = {
                ...(minPrice && { $gte: Number(minPrice) }),
                ...(maxPrice && { $lte: Number(maxPrice) }),
            };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }

        const services = await Service.find(query)
            .sort({ createdAt: -1 })
            .populate("provider", "name email avatar");

        res.status(200).json({
            success: true,
            count: services.length,
            data: services,
        });
    } catch (err) {
        console.error("FILTER SERVICES ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// ------------------------------
// GET SINGLE SERVICE
// ------------------------------
exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id).populate("provider", "name email avatar");

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
// UPDATE SERVICE (only owner)
// ------------------------------
exports.updateService = async (req, res) => {
    try {
        let service = await Service.findById(req.params.id);

        if (!service) {
            return res.status(404).json({ success: false, message: "Service not found" });
        }

        // Ensure only owner can update
        if (service.provider.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this service",
            });
        }

        // Fields allowed to update
        const allowedFields = ['title', 'description', 'category', 'price', 'location', 'images', 'isAvailable'];
        
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                service[field] = req.body[field];
            }
        });

        await service.save();

        res.status(200).json({
            success: true,
            message: "Service updated successfully",
            data: service,
        });
    } catch (err) {
        console.error("UPDATE SERVICE ERROR:", err);
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

exports.adminToggleServiceAvailable = async (req, res) => {
  try {
    const { id } = req.params;
    const { available } = req.body;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    service.isAvailable = Boolean(available);
    await service.save();
    res.status(200).json({ success: true, isAvailable: service.isAvailable });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.adminDeleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    await service.deleteOne();
    res.status(200).json({ success: true, message: "Service deleted (admin)" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
