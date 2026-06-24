// routes/rideRoutes.js
const express = require('express');
const router = express.Router();
const {
  createRide,
  getOpenRides,
  acceptRide,
  startRide,
  completeRide,
  cancelRide,
  getRideById,
  getUserRides
} = require('../controllers/rideController');
const { protect } = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.get('/open', getOpenRides);
router.use(protect);

router.post('/', createRide);
router.post('/:id/accept', acceptRide);
router.post('/:id/start', startRide);
router.post('/:id/complete', completeRide);
router.post('/:id/cancel', cancelRide);
router.get('/:id', getRideById);
router.get('/user/:userId', getUserRides);
router.get('/admin/overview', admin, require('../controllers/rideController').getAdminRideOverview);

module.exports = router;
