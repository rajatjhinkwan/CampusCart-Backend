// controllers/requestController.js
const Request = require("../models/requestModel");

// ----------------------------------
// CREATE REQUEST
// ----------------------------------
exports.createRequest = async (req, res) => {
    try {
        const { title, description, category, location, budget, urgency } = req.body;

        const newRequest = await Request.create({
            title,
            description,
            category,
            location,
            budget,
            urgency,
            postedBy: req.user._id,
        });

        res.status(201).json({
            success: true,
            message: "Request created successfully",
            data: newRequest,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------------------------
// GET ALL REQUESTS
// ----------------------------------
exports.getAllRequests = async (req, res) => {
    try {
        const { category, location, search } = req.query;
        let query = { status: "Open" };

        if (category) {
            query.category = category;
        }

        if (location) {
            query.location = { $regex: location, $options: "i" };
        }

        if (search) {
            query.$text = { $search: search };
        }

        const requests = await Request.find(query)
            .populate("postedBy", "name email profilePicture")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: requests.length,
            data: requests,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------------------------
// GET SINGLE REQUEST
// ----------------------------------
exports.getRequestById = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id)
            .populate("postedBy", "name email profilePicture");

        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        res.status(200).json({
            success: true,
            data: request,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ----------------------------------
// DELETE REQUEST
// ----------------------------------
exports.deleteRequest = async (req, res) => {
    try {
        const request = await Request.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        // Check ownership
        if (request.postedBy.toString() !== req.user._id.toString()) {
            return res.status(401).json({ success: false, message: "Not authorized" });
        }

        await request.deleteOne();

        res.status(200).json({
            success: true,
            message: "Request deleted successfully",
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
