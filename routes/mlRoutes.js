const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const mlController = require("../controllers/mlController");

router.post("/predict", upload.single("image"), mlController.predict);

module.exports = router;

