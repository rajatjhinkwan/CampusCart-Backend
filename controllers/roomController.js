const Room = require("../models/roomModel");
const { uploadFromBuffer } = require("../config/cloudinary");

/* ------------------------------------------------
   CREATE A NEW ROOM
------------------------------------------------- */
exports.createRoom = async (req, res) => {
    let locationPayload = req.body.location;
    try {
        if (typeof locationPayload === "string") locationPayload = JSON.parse(locationPayload);
    } catch (e) {
        locationPayload = undefined;
    }

    let images = [];
    if (req.files && req.files.length > 0) {
        const uploads = await Promise.all(
            req.files.map((file) => uploadFromBuffer(file.buffer, { folder: "rooms" }))
        );
        images = uploads.map(u => ({ url: u.secure_url, public_id: u.public_id }));
    }

    const rent = req.body.rent ? Number(req.body.rent) : undefined;
    const bhk = req.body.bhk ? Number(req.body.bhk) : undefined;
    const availableFrom = req.body.availableFrom ? new Date(req.body.availableFrom) : undefined;

    let features = req.body.features;
    let rules = req.body.rules;
    try { if (typeof features === "string") features = JSON.parse(features); } catch {}
    try { if (typeof rules === "string") rules = JSON.parse(rules); } catch {}

    const roomData = {
        title: req.body.title,
        description: req.body.description,
        rent,
        securityDeposit: req.body.securityDeposit ? Number(req.body.securityDeposit) : 0,
        location: locationPayload && (locationPayload.city || locationPayload.area) ? {
            city: locationPayload.city || "",
            area: locationPayload.area || ""
        } : undefined,
        address: locationPayload?.address || req.body.address || "",
        seller: req.user._id,
        images,
        roomType: req.body.roomType,
        bhk,
        furnished: req.body.furnished,
        availableFrom,
        features,
        rules,
        contactNumber: req.body.contactNumber,
    };

    const room = new Room(roomData);
    const savedRoom = await room.save();

    res.status(201).json({
        success: true,
        message: "Room created successfully",
        data: savedRoom
    });
};


/* ------------------------------------------------
   GET ALL ROOMS (Filters + Pagination)
------------------------------------------------- */
exports.getAllRooms = async (req, res) => {
    const { city, priceMin, priceMax, roomType, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (city) filter["location.city"] = city;
    if (roomType) filter.roomType = roomType;
    if (priceMin) filter.rent = { ...filter.rent, $gte: priceMin };
    if (priceMax) filter.rent = { ...filter.rent, $lte: priceMax };

    const skip = (page - 1) * limit;

    const rooms = await Room.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms
    });
};

/* ------------------------------------------------
   FILTER ROOMS (Advanced Filters)
------------------------------------------------- */
exports.filterRooms = async (req, res) => {
    const {
        q,
        city,
        minPrice,
        maxPrice,
        roomType,
        furnished,
        bhk,
        sort = "createdAt_desc",
        page = 1,
        limit = 20
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = {};

    // Text search
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } }
        ];
    }

    // Location filter
    if (city) filter["location.city"] = { $regex: city, $options: "i" };

    // Room type filter
    if (roomType) filter.roomType = roomType;

    // Furnished filter
    if (furnished) filter.furnished = furnished;

    // BHK filter
    if (bhk) filter.bhk = Number(bhk);

    // Price filter
    if (minPrice || maxPrice) {
        filter.rent = {};
        if (minPrice) filter.rent.$gte = Number(minPrice);
        if (maxPrice) filter.rent.$lte = Number(maxPrice);
    }

    // Sorting
    const sortOptions = {};
    const [sortField, sortOrder] = sort.split("_");
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    // Fetch data
    const rooms = await Room.find(filter)
        .populate("seller", "name email")
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);

    const total = await Room.countDocuments(filter);

    res.json({
        success: true,
        total,
        page,
        limit,
        data: rooms
    });
};


/* ------------------------------------------------
   SEARCH ROOMS (title + description)
------------------------------------------------- */
exports.searchRooms = async (req, res) => {
    const { q } = req.query;

    if (!q || q.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Search query is required"
        });
    }

    const rooms = await Room.find({
        $or: [
            { title: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } }
        ]
    });

    res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms
    });
};


/* ------------------------------------------------
   GET ROOMS CREATED BY LOGGED-IN USER
------------------------------------------------- */
exports.getRoomsBySeller = async (req, res) => {
    const rooms = await Room.find({ seller: req.user._id });

    res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms
    });
};


/* ------------------------------------------------
   INCREMENT ROOM VIEWS
------------------------------------------------- */
exports.incrementRoomViews = async (req, res) => {
    const room = await Room.findById(req.params.id);

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    room.views += 1;
    await room.save();

    res.status(200).json({
        success: true,
        message: "View count updated",
        views: room.views
    });
};


/* ------------------------------------------------
   GET ROOM BY ID
------------------------------------------------- */
exports.getRoomById = async (req, res) => {
    const room = await Room.findById(req.params.id).populate("seller", "name email");

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    res.status(200).json({
        success: true,
        data: room
    });
};


/* ------------------------------------------------
   UPDATE ROOM
------------------------------------------------- */
exports.updateRoom = async (req, res) => {
    const room = await Room.findById(req.params.id);

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    if (String(room.seller) !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: "Not authorized to update this room"
        });
    }

    const updatedRoom = await Room.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: "Room updated successfully",
        data: updatedRoom
    });
};


/* ------------------------------------------------
   DELETE ROOM
------------------------------------------------- */
exports.deleteRoom = async (req, res) => {
    const room = await Room.findById(req.params.id);

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    if (String(room.seller) !== req.user._id.toString()) {
        return res.status(403).json({
            success: false,
            message: "Not authorized to delete this room"
        });
    }

    await room.deleteOne();

    res.status(200).json({
        success: true,
        message: "Room deleted successfully"
    });
};
