const { verifyTokenFromSocket } = require('./socketAuth');
const DriverLocation = require('../models/driverLocationModel');
const Ride = require('../models/rideModel');

function register(io) {
  io.on('connection', (socket) => {
    // Authenticate user
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = verifyTokenFromSocket(token);
    if (!user) {
      socket.emit('unauthorized');
      return socket.disconnect(true);
    }

    // Join personal room
    const userRoom = `user_${user.id}`;
    socket.join(userRoom);

    // Join drivers room if user is a driver (you can add role check here)
    // For now, assume all authenticated users can be drivers/passengers
    socket.join('drivers');

    // Handle driver location updates
    socket.on('driverLocation', async (data) => {
      try {
        const { driverId, lat, lng, speed = 0, heading, accuracy } = data;

        if (!driverId || lat === undefined || lng === undefined) {
          return socket.emit('error', { message: 'Invalid location data' });
        }

        // Update or create driver location
        await DriverLocation.findOneAndUpdate(
          { driverId },
          {
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            speed,
            heading,
            accuracy,
            timestamp: new Date()
          },
          { upsert: true, new: true }
        );

        // Emit location update to passengers in assigned rides
        const assignedRides = await Ride.find({
          assignedDriverId: driverId,
          status: { $in: ['ASSIGNED', 'ON_ROUTE'] }
        }).select('passengerId');

        assignedRides.forEach(ride => {
          io.to(`user_${ride.passengerId}`).emit('driverLocationUpdate', {
            rideId: ride._id,
            driverId,
            lat,
            lng,
            speed,
            timestamp: new Date()
          });
        });

      } catch (error) {
        console.error('Error updating driver location:', error);
        socket.emit('error', { message: 'Failed to update location' });
      }
    });

    // Handle ride status updates (e.g., start ride, complete ride)
    socket.on('updateRideStatus', async (data) => {
      try {
        const { rideId, status } = data;
        const allowedStatuses = ['ON_ROUTE', 'COMPLETED', 'CANCELLED'];

        if (!rideId || !allowedStatuses.includes(status)) {
          return socket.emit('error', { message: 'Invalid ride status update' });
        }

        const updateData = { status };
        if (status === 'COMPLETED') updateData.completedAt = new Date();
        if (status === 'CANCELLED') updateData.cancelledAt = new Date();

        const ride = await Ride.findByIdAndUpdate(rideId, updateData, { new: true })
          .populate('passengerId', 'name avatar')
          .populate('assignedDriverId', 'name avatar');

        if (!ride) {
          return socket.emit('error', { message: 'Ride not found' });
        }

        // Emit status update to both passenger and driver
        io.to(`user_${ride.passengerId._id}`).emit('rideStatusUpdate', {
          rideId: ride._id,
          status: ride.status,
          updatedAt: new Date()
        });
        io.to(`user_${ride.assignedDriverId._id}`).emit('rideStatusUpdate', {
          rideId: ride._id,
          status: ride.status,
          updatedAt: new Date()
        });

      } catch (error) {
        console.error('Error updating ride status:', error);
        socket.emit('error', { message: 'Failed to update ride status' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Ride socket disconnected:', socket.id);
    });
  });
}

module.exports = { register };
