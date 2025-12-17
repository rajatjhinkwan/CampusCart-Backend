// routes/jobRoutes.js
const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const handleAsync = require("../utils/handleAsync"); // Optional wrapper for async errors
const upload = require("../middleware/uploadMiddleware");

// Create a job (protected)
router.post("/", auth.protect, upload.array('images', 6), handleAsync(jobController.createJob));

// Get all jobs
router.get("/", handleAsync(jobController.getAllJobs));

// Filter jobs (advanced filters)
router.get("/filter", handleAsync(jobController.filterJobs));

// Get single job
router.get("/:id", handleAsync(jobController.getJobById));

// Update job (protected)
router.put("/:id", auth.protect, handleAsync(jobController.updateJob));

// Delete job (protected)
router.delete("/:id", auth.protect, handleAsync(jobController.deleteJob));

// ADMIN: toggle active and delete
router.patch("/:id/admin/active", auth.protect, admin, handleAsync(jobController.adminToggleJobActive));
router.delete("/:id/admin", auth.protect, admin, handleAsync(jobController.adminDeleteJob));

module.exports = router;
