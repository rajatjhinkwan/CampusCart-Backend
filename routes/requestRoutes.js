// routes/requestRoutes.js
const express = require("express");
const router = express.Router();
const {
    createRequest,
    getAllRequests,
    getRequestById,
    deleteRequest,
    updateRequest,
    getMyRequests
} = require("../controllers/requestController");
const { protect } = require("../middleware/authMiddleware");

// Public routes (Viewing)
router.get("/", getAllRequests);

// Protected routes (User Specific)
router.get("/my-requests", protect, getMyRequests);

// Place getById AFTER specific routes
router.get("/:id", getRequestById);

// Protected routes (Creating/Updating/Deleting)
router.post("/", protect, createRequest);
router.put("/:id", protect, updateRequest);
router.delete("/:id", protect, deleteRequest);

module.exports = router;
