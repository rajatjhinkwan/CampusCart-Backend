// routes/requestRoutes.js
const express = require("express");
const router = express.Router();
const {
    createRequest,
    getAllRequests,
    getRequestById,
    deleteRequest
} = require("../controllers/requestController");
const { protect } = require("../middleware/authMiddleware");

// Public routes (Viewing)
router.get("/", getAllRequests);
router.get("/:id", getRequestById);

// Protected routes (Creating/Deleting)
router.post("/", protect, createRequest);
router.delete("/:id", protect, deleteRequest);

module.exports = router;
