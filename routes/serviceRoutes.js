// routes/serviceRoutes.js
const express = require("express");
const router = express.Router();

const serviceController = require("../controllers/serviceController");
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const handleAsync = require("../utils/handleAsync");
const upload = require("../middleware/uploadMiddleware");

// ----------------------------------
// CREATE SERVICE (Protected)
// ----------------------------------
router.post("/", auth.protect, upload.array('images', 6), handleAsync(serviceController.createService));
router.put("/:id", auth.protect, handleAsync(serviceController.updateService));

// ----------------------------------
// GET ALL SERVICES (Filters)
// ----------------------------------
router.get("/", handleAsync(serviceController.getAllServices));

// ----------------------------------
// FILTER SERVICES (Advanced Filters)
// ----------------------------------
router.get("/filter", handleAsync(serviceController.filterServices));

// ----------------------------------
// GET SINGLE SERVICE
// ----------------------------------
router.get("/:id", handleAsync(serviceController.getServiceById));

// ----------------------------------
// 💬 REVIEWS
// ----------------------------------
router.post("/:serviceId/reviews", auth.protect, handleAsync(reviewController.createReview));
router.get("/:serviceId/reviews", handleAsync(reviewController.getReviews));

// ----------------------------------
// DELETE SERVICE (Protected)
// ----------------------------------
router.delete("/:id", auth.protect, handleAsync(serviceController.deleteService));

// ADMIN: toggle availability and delete
router.patch("/:id/admin/available", auth.protect, admin, handleAsync(serviceController.adminToggleServiceAvailable));
router.delete("/:id/admin", auth.protect, admin, handleAsync(serviceController.adminDeleteService));

module.exports = router;
