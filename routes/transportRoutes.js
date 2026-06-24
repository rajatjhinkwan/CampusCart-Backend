const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require("../middleware/uploadMiddleware");
const { 
    createTransport, 
    getTransports, 
    getTransportById,
    getTransportsByDriver,
    updateTransport,
    deleteTransport
} = require('../controllers/transportController');

// Public routes
router.get('/', getTransports);

// Protected routes (Seller/Driver)
router.get('/seller/my-transports', protect, getTransportsByDriver);
router.post('/', protect, upload.array('images', 6), createTransport);
router.put('/:id', protect, updateTransport);
router.delete('/:id', protect, deleteTransport);

// Place getById last to avoid conflict with specific paths like /seller/...
router.get('/:id', getTransportById);

module.exports = router;
