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

router.use(protect); // all routes need auth

router.post('/', createRide);
router.get('/open', getOpenRides);
router.post('/:id/accept', acceptRide);
router.post('/:id/start', startRide);
router.post('/:id/complete', completeRide);
router.post('/:id/cancel', cancelRide);
router.get('/:id', getRideById);
router.get('/user/:userId', getUserRides);

module.exports = router;
