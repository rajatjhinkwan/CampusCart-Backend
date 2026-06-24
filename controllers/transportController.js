const Transport = require('../models/transportModel');
const User = require('../models/userModel');
const { uploadFromBuffer } = require('../config/cloudinary');

// Create a new Transport listing
exports.createTransport = async (req, res) => {
  try {
    const {
      from,
      to,
      departureTime,
      frequency,
      departureDate,
      vehicleName,
      vehicleType,
      vehicleNumber,
      seatsAvailable,
      price,
      description
    } = req.body;

    let parsedFrom = from;
    let parsedTo = to;
    if (typeof from === 'string') {
      try { parsedFrom = JSON.parse(from); } catch (e) {}
    }
    if (typeof to === 'string') {
      try { parsedTo = JSON.parse(to); } catch (e) {}
    }

    let transportImages = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadResults = await Promise.all(
          req.files.map((file) => uploadFromBuffer(file.buffer, { folder: "transports" }))
        );
        transportImages = uploadResults.map((r) => ({
          url: r.secure_url,
          public_id: r.public_id,
        }));
      } catch (err) {
        transportImages = req.files.map((file, i) => {
          const b64 = file.buffer.toString("base64");
          const url = `data:${file.mimetype};base64,${b64}`;
          return { url, public_id: `local-${Date.now()}-${i}` };
        });
      }
    }

    const newTransport = await Transport.create({
      driver: req.user.id,
      from: parsedFrom,
      to: parsedTo,
      departureTime,
      frequency,
      departureDate,
      vehicleName,
      vehicleType,
      vehicleNumber,
      seatsAvailable,
      price: Number(price),
      images: transportImages,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Transport listing created successfully',
      transport: newTransport
    });
  } catch (error) {
    console.error('Create Transport Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create transport listing',
      error: error.message
    });
  }
};

// Get all transports with filters
exports.getTransports = async (req, res) => {
  try {
    const { fromCity, toCity, date, type } = req.query;
    
    let query = { status: 'Active' };

    if (fromCity) {
      query['from.city'] = { $regex: fromCity, $options: 'i' };
    }
    if (toCity) {
      query['to.city'] = { $regex: toCity, $options: 'i' };
    }
    if (type) {
      query.vehicleType = type;
    }
    
    // Date filter logic can be complex (One-time vs Daily), simplifying for now
    // If user asks for a specific date, we show "Daily" + "One-time" on that date
    if (date) {
        const searchDate = new Date(date);
        const startOfDay = new Date(searchDate.setHours(0,0,0,0));
        const endOfDay = new Date(searchDate.setHours(23,59,59,999));

        query.$or = [
            { frequency: 'Daily' },
            { 
                frequency: 'One-time', 
                departureDate: { $gte: startOfDay, $lte: endOfDay } 
            }
        ];
    }

    const transports = await Transport.find(query)
      .populate('driver', 'name avatar rating isVerified')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transports.length,
      transports
    });
  } catch (error) {
    console.error('Get Transports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transports',
      error: error.message
    });
  }
};

// Get single transport
exports.getTransportById = async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id)
      .populate('driver', 'name avatar rating isVerified createdAt');
    
    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    res.status(200).json({ success: true, transport });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get transports by driver (for seller dashboard)
exports.getTransportsByDriver = async (req, res) => {
  try {
    const transports = await Transport.find({ driver: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transports.length,
      transports
    });
  } catch (error) {
    console.error('Get My Transports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your transports',
      error: error.message
    });
  }
};

// Update transport
exports.updateTransport = async (req, res) => {
  try {
    let transport = await Transport.findById(req.params.id);

    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    // Check ownership
    if (transport.driver.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this transport' });
    }

    transport = await Transport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      transport
    });
  } catch (error) {
    console.error('Update Transport Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update transport',
      error: error.message
    });
  }
};

// Delete transport
exports.deleteTransport = async (req, res) => {
  try {
    const transport = await Transport.findById(req.params.id);

    if (!transport) {
      return res.status(404).json({ success: false, message: 'Transport not found' });
    }

    // Check ownership
    if (transport.driver.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this transport' });
    }

    await transport.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Transport deleted successfully'
    });
  } catch (error) {
    console.error('Delete Transport Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transport',
      error: error.message
    });
  }
};
