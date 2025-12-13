// controllers/rideController.js
const Ride = require('../models/rideModel');
const DriverLocation = require('../models/driverLocationModel');
const { haversineDistance, estimateETAmins } = require('../utils/haversine');
const mongoose = require('mongoose');

// ------------------------------------------------------------------
// 1️⃣ CREATE A NEW RIDE REQUEST
// ------------------------------------------------------------------
exports.createRide = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { from, to, seatsRequested } = req.body;
    const passengerId = req.user.id; // <‑‑ now we trust the JWT

    // ---- Validation ------------------------------------------------
    if (!from?.address || !to?.address || !from?.lat || !from?.lng || !to?.lat || !to?.lng) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Invalid request body' });
    }
    if (seatsRequested < 1 || seatsRequested > 10) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'seatsRequested must be between 1‑10' });
    }

    // ---- Compute distance / ETA ------------------------------------
    const distanceKm = haversineDistance([from.lat, from.lng], [to.lat, to.lng]);
    const estimatedDurationMins = estimateETAmins(distanceKm);

    // ---- Build the GeoJSON points ---------------------------------
    const fromLocation = { type: 'Point', coordinates: [from.lng, from.lat] };
    const toLocation = { type: 'Point', coordinates: [to.lng, to.lat] };

    // ---- Ride document ---------------------------------------------
    const ride = await Ride.create(
      [
        {
          passengerId,
          from: { address: from.address, lat: from.lat, lng: from.lng, location: fromLocation },
          to: { address: to.address, lat: to.lat, lng: to.lng, location: toLocation },
          seatsRequested,
          distanceKm,
          estimatedDurationMins
        }
      ],
      { session }
    );

    await session.commitTransaction();

    // ---- Emit realtime event ----------------------------------------
    const io = req.app.get('io');
    io.to('drivers').emit('newRide', {
      rideId: ride[0]._id,
      passengerId,
      from: ride[0].from,
      to: ride[0].to,
      seatsRequested,
      distanceKm,
      estimatedDurationMins
    });

    res.status(201).json({ success: true, ride: ride[0] });
  } catch (err) {
    await session.abortTransaction();
    console.error('createRide error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    session.endSession();
  }
};

// ------------------------------------------------------------------
// 2️⃣ GET OPEN RIDES NEAR DRIVER LOCATION
// ------------------------------------------------------------------
exports.getOpenRides = async (req, res) => {
  try {
    const { lat, lng, radiusKm = 10 } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = radiusKm * 1000;

    const rides = await Ride.find({
      status: 'OPEN',
      'from.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: radiusMeters
        }
      }
    })
      .populate('passengerId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50); // you can increase/decrease it.

    res.json({ success: true, count: rides.length, rides });
  } catch (err) {
    console.error('getOpenRides error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// 3️⃣ ACCEPT A RIDE (atomic, optimistic)
// ------------------------------------------------------------------
exports.acceptRide = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const driverId = req.user.id; // driver is the authenticated user

    // One single update ensures nobody else can snatch the same ride.
    const ride = await Ride.findOneAndUpdate(
      { _id: id, status: 'OPEN' },
      {
        $set: {
          status: 'ASSIGNED',
          assignedDriverId: driverId,
          assignedAt: new Date()
        }
      },
      { new: true, session }
    )
      .populate('passengerId', 'name avatar')
      .populate('assignedDriverId', 'name avatar');

    if (!ride) {
      await session.abortTransaction();
      return res.status(409).json({ message: 'Ride already assigned or does not exist' });
    }

    // Notify passenger + driver via sockets
    const io = req.app.get('io');
    const passengerRoom = `user_${ride.passengerId._id}`;
    const driverRoom = `user_${driverId}`;

    const payload = {
      rideId: ride._id,
      driverId,
      driverName: ride.assignedDriverId.name,
      driverAvatar: ride.assignedDriverId.avatar,
      from: ride.from,
      to: ride.to
    };
    io.to(passengerRoom).emit('rideAssigned', payload);
    io.to(driverRoom).emit('rideAssigned', payload);

    await session.commitTransaction();
    res.json({ success: true, ride });
  } catch (err) {
    await session.abortTransaction();
    console.error('acceptRide error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    session.endSession();
  }
};

// ------------------------------------------------------------------
// 4️⃣ START A RIDE
// ------------------------------------------------------------------
exports.startRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;

    const ride = await Ride.findOneAndUpdate(
      { _id: id, status: 'ASSIGNED', assignedDriverId: driverId },
      { $set: { status: 'ON_ROUTE' } },
      { new: true }
    )
      .populate('passengerId', 'name avatar')
      .populate('assignedDriverId', 'name avatar');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or not yours' });
    }

    const io = req.app.get('io');
    const passengerRoom = `user_${ride.passengerId._id}`;
    const driverRoom = `user_${driverId}`;

    io.to(passengerRoom).emit('rideStarted', { rideId: ride._id });
    io.to(driverRoom).emit('rideStarted', { rideId: ride._id });

    res.json({ success: true, ride });
  } catch (err) {
    console.error('startRide error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// 5️⃣ COMPLETE A RIDE
// ------------------------------------------------------------------
exports.completeRide = async (req, res) => {
  try {
    const { id } = req.params;
    const driverId = req.user.id;
    const { actualDurationMins } = req.body;

    const ride = await Ride.findOneAndUpdate(
      { _id: id, status: 'ON_ROUTE', assignedDriverId: driverId },
      {
        $set: {
          status: 'COMPLETED',
          completedAt: new Date(),
          actualDurationMins: actualDurationMins ?? null
        }
      },
      { new: true }
    )
      .populate('passengerId', 'name avatar')
      .populate('assignedDriverId', 'name avatar');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or not yours' });
    }

    const io = req.app.get('io');
    const passengerRoom = `user_${ride.passengerId._id}`;
    const driverRoom = `user_${driverId}`;

    io.to(passengerRoom).emit('rideCompleted', { rideId: ride._id });
    io.to(driverRoom).emit('rideCompleted', { rideId: ride._id });

    res.json({ success: true, ride });
  } catch (err) {
    console.error('completeRide error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// 6️⃣ CANCEL A RIDE (passenger or driver)
// ------------------------------------------------------------------
exports.cancelRide = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // the caller (passenger or driver)

    const ride = await Ride.findById(id)
      .populate('passengerId')
      .populate('assignedDriverId');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    const isPassenger = ride.passengerId._id.equals(userId);
    const isDriver = ride.assignedDriverId?.equals(userId);

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to cancel this ride' });
    }

    if (ride.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Cannot cancel a completed ride' });
    }

    ride.status = 'CANCELLED';
    ride.cancelledAt = new Date();
    await ride.save();

    const io = req.app.get('io');
    const passengerRoom = `user_${ride.passengerId._id}`;
    const driverRoom = ride.assignedDriverId ? `user_${ride.assignedDriverId._id}` : null;

    const payload = {
      rideId: ride._id,
      cancelledBy: userId,
      reason: req.body.reason || 'No reason supplied'
    };

    io.to(passengerRoom).emit('rideCancelled', payload);
    if (driverRoom) io.to(driverRoom).emit('rideCancelled', payload);

    res.json({ success: true, ride });
  } catch (err) {
    console.error('cancelRide error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// 7️⃣ GET RIDE BY ID
// ------------------------------------------------------------------
exports.getRideById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ride = await Ride.findById(id)
      .populate('passengerId', 'name avatar')
      .populate('assignedDriverId', 'name avatar');

    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if user is authorized (passenger or driver)
    const isPassenger = ride.passengerId._id.equals(userId);
    const isDriver = ride.assignedDriverId && ride.assignedDriverId._id.equals(userId);

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to view this ride' });
    }

    res.json({ success: true, ride });
  } catch (err) {
    console.error('getRideById error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ------------------------------------------------------------------
// 8️⃣ GET USER RIDES (as passenger or driver)
// ------------------------------------------------------------------
exports.getUserRides = async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.user.id;

    // Only allow users to view their own rides
    if (userId !== authenticatedUserId) {
      return res.status(403).json({ message: 'Not authorized to view these rides' });
    }

    const rides = await Ride.find({
      $or: [
        { passengerId: userId },
        { assignedDriverId: userId }
      ]
    })
      .populate('passengerId', 'name avatar')
      .populate('assignedDriverId', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: rides.length, rides });
  } catch (err) {
    console.error('getUserRides error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
