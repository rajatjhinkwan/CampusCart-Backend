// routes/serviceRoutes.js
const express = require("express");
const router = express.Router();

const serviceController = require("../controllers/serviceController");
const auth = require("../middleware/authMiddleware");
const handleAsync = require("../utils/handleAsync");
const upload = require("../middleware/uploadMiddleware");

// ----------------------------------
// CREATE SERVICE (Protected)
// ----------------------------------
router.post("/", auth.protect, upload.array('images', 6), handleAsync(serviceController.createService));

// ----------------------------------
// GET ALL SERVICES (Filters)
// ----------------------------------
router.get("/", handleAsync(serviceController.getAllServices));

// ----------------------------------
// GET SINGLE SERVICE
// ----------------------------------
router.get("/:id", handleAsync(serviceController.getServiceById));

// ----------------------------------
// DELETE SERVICE (Protected)
// ----------------------------------
router.delete("/:id", auth.protect, handleAsync(serviceController.deleteService));

module.exports = router;
