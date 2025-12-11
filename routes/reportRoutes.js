const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware'); // <-- use protect
const admin = require('../middleware/adminMiddleware');
const handleAsync = require('../utils/handleAsync');

// =========================
// 🧾 REPORT ROUTES
// =========================

// Create report (Product or User)
router.post('/:productId', protect, handleAsync(reportController.createReport));

// Admin: Get all reports
router.get('/', protect, admin, handleAsync(reportController.getAllReports));

// Admin: Resolve a report (remove or ignore)
router.patch('/:reportId/resolve', protect, admin, handleAsync(reportController.resolveReport));

module.exports = router;
