const axios = require("axios");

// Bridge to Python Microservice
const predictPrice = async (req, res) => {
  try {
    const { category, condition, originalPrice } = req.body;

    if (!category || !originalPrice) {
      return res.status(400).json({ error: "Category and Original Price are required" });
    }

    // Call Python API
    // Assumption: Python service runs on port 8000
    const pythonServiceUrl = "http://localhost:8000/predict-price";
    
    const response = await axios.post(pythonServiceUrl, {
      category,
      condition: condition || "Used",
      original_price: Number(originalPrice)
    });

    return res.status(200).json(response.data);

  } catch (error) {
    console.error("ML Service Error:", error.message);
    // Fallback if Python service is down
    if (error.code === "ECONNREFUSED") {
        return res.status(503).json({ error: "ML Service unavailable" });
    }
    return res.status(500).json({ error: "Prediction failed" });
  }
};

const predictImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const filename = String(req.file.originalname || "").toLowerCase();
    let label = "Item";

    if (/iphone|samsung|pixel|phone|mobile|android/i.test(filename)) {
      label = "Smart Phone";
    } else if (/laptop|macbook|notebook|lenovo|hp|dell/i.test(filename)) {
      label = "Laptop";
    } else if (/car|bike|scooter|vehicle|motorcycle/i.test(filename)) {
      label = "Vehicle";
    } else if (/chair|table|desk|sofa|bed|furniture/i.test(filename)) {
      label = "Furniture";
    } else if (/book|textbook|novel/i.test(filename)) {
      label = "Book";
    }

    console.log(`[ML] Mock image classification predicted: ${label} for file: ${req.file.originalname}`);

    return res.status(200).json({
      success: true,
      data: {
        label,
        confidence: 0.92,
      },
    });
  } catch (error) {
    console.error("Image classification error:", error);
    return res.status(500).json({ error: "Image prediction failed" });
  }
};

module.exports = { predictPrice, predictImage };
