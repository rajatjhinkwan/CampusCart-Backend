const mongoose = require('mongoose');
const Ride = require('./models/rideModel');
const DriverLocation = require('./models/driverLocationModel');
const User = require('./models/userModel');
require('dotenv').config();

const mockUsers = [
  {
    name: 'John Passenger',
    email: 'john@example.com',
    password: 'password123',
    role: 'buyer'
  },
  {
    name: 'Jane Driver',
    email: 'jane@example.com',
    password: 'password123',
    role: 'seller' // Using seller as driver role
  }
];

function withGeo(from, to) {
  return {
    from: {
      address: from.address,
      lat: from.lat,
      lng: from.lng,
      location: { type: 'Point', coordinates: [from.lng, from.lat] }
    },
    to: {
      address: to.address,
      lat: to.lat,
      lng: to.lng,
      location: { type: 'Point', coordinates: [to.lng, to.lat] }
    }
  };
}

const mockRides = [
  {
    passengerId: null,
    ...withGeo(
      { address: 'Hostel A, IIT Delhi', lat: 28.5440, lng: 77.1926 },
      { address: 'Library, IIT Delhi', lat: 28.5470, lng: 77.1900 }
    ),
    seatsRequested: 1,
    status: 'OPEN'
  },
  {
    passengerId: null,
    ...withGeo(
      { address: 'Lecture Hall Complex, IIT Delhi', lat: 28.5450, lng: 77.1850 },
      { address: 'Sports Complex, IIT Delhi', lat: 28.5490, lng: 77.1880 }
    ),
    seatsRequested: 2,
    status: 'OPEN'
  }
];

const mockDriverLocations = [
  {
    driverId: null, // Will be set after user creation
    location: {
      type: 'Point',
      coordinates: [77.1910, 28.5450] // lng, lat
    },
    speed: 25,
    heading: 90,
    accuracy: 10
  }
];

async function seedData() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGO_URI not set');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Ride.deleteMany({});
    await DriverLocation.deleteMany({});
    console.log('Cleared existing ride data');

    // Create users
    const users = await User.insertMany(mockUsers);
    console.log('Created mock users');

    // Set passenger and driver IDs
    mockRides[0].passengerId = users[0]._id;
    mockRides[1].passengerId = users[0]._id;
    mockDriverLocations[0].driverId = users[1]._id;

    // Create rides
    await Ride.insertMany(mockRides);
    console.log('Created mock rides');

    // Create driver locations
    await DriverLocation.insertMany(mockDriverLocations);
    console.log('Created mock driver locations');

    console.log('✅ Mock data seeded successfully!');
    console.log(`Created ${mockRides.length} rides and ${mockDriverLocations.length} driver locations`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  seedData();
}

module.exports = { seedData };
