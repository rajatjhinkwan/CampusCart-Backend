const express = require("express");
const router = express.Router();
const { predictPrice, predictImage } = require("../controllers/mlController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Route: POST /api/ml/predict-price
router.post("/predict-price", protect, predictPrice);

// Route: POST /api/ml/predict (for photo classification)
router.post("/predict", protect, upload.single("image"), predictImage);

module.exports = router;
