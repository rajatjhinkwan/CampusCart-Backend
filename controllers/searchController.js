const Product = require("../models/productModel");
const Room = require("../models/roomModel");
const Service = require("../models/serviceModel");
const Job = require("../models/jobModel");
const handleAsync = require("../utils/handleAsync");

// Global search across all entities
const globalSearch = handleAsync(async (req, res) => {
  const { q: query, category, location, limit = 20 } = req.query;

  if (!query || query.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  const searchRegex = new RegExp(query.trim(), "i"); // Case-insensitive regex
  const results = {
    products: [],
    rooms: [],
    services: [],
    jobs: [],
  };

  // Search Products
  const productQuery = {
    $or: [
      { title: searchRegex },
      { description: searchRegex },
    ],
    isSold: false, // Only active products
  };
  if (category && category !== "all") {
    // Assuming category is a string name, need to find ObjectId
    // For simplicity, we'll search by category name if it's a string
    productQuery.category = category; // This might need adjustment based on how category is stored
  }
  if (location) {
    productQuery.location = searchRegex;
  }
  results.products = await Product.find(productQuery)
    .populate("seller", "name email")
    .populate("category", "name")
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  // Search Rooms
  const roomQuery = {
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { "location.city": searchRegex },
      { "location.area": searchRegex },
      { tags: searchRegex },
    ],
    isActive: true,
  };
  if (location) {
    roomQuery.$or.push({ "location.city": searchRegex }, { "location.area": searchRegex });
  }
  results.rooms = await Room.find(roomQuery)
    .populate("seller", "name email")
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  // Search Services
  const serviceQuery = {
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { category: searchRegex },
      { "location.city": searchRegex },
    ],
    isAvailable: true,
  };
  if (location) {
    serviceQuery.$or.push({ "location.city": searchRegex });
  }
  results.services = await Service.find(serviceQuery)
    .populate("provider", "name email")
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  // Search Jobs
  const jobQuery = {
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { companyName: searchRegex },
      { location: searchRegex },
    ],
    isActive: true,
  };
  if (location) {
    jobQuery.$or.push({ location: searchRegex });
  }
  results.jobs = await Job.find(jobQuery)
    .populate("postedBy", "name email")
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  // Combine and sort by relevance (simple: by createdAt for now)
  const allResults = [
    ...results.products.map(item => ({ ...item.toObject(), type: 'product' })),
    ...results.rooms.map(item => ({ ...item.toObject(), type: 'room' })),
    ...results.services.map(item => ({ ...item.toObject(), type: 'service' })),
    ...results.jobs.map(item => ({ ...item.toObject(), type: 'job' })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.status(200).json({
    success: true,
    message: "Search results retrieved successfully",
    data: {
      query,
      totalResults: allResults.length,
      results: allResults.slice(0, parseInt(limit)),
      breakdown: {
        products: results.products.length,
        rooms: results.rooms.length,
        services: results.services.length,
        jobs: results.jobs.length,
      },
    },
  });
});

// Search suggestions (autocomplete)
const getSearchSuggestions = handleAsync(async (req, res) => {
  const { q: query } = req.query;

  if (!query || query.trim() === "") {
    return res.status(200).json({
      success: true,
      suggestions: [],
    });
  }

  const searchRegex = new RegExp(`^${query.trim()}`, "i"); // Start with query
  const suggestions = new Set();

  // Get suggestions from titles
  const [productTitles, roomTitles, serviceTitles, jobTitles] = await Promise.all([
    Product.find({ title: searchRegex, isSold: false }).select("title").limit(5),
    Room.find({ title: searchRegex, isActive: true }).select("title").limit(5),
    Service.find({ title: searchRegex, isAvailable: true }).select("title").limit(5),
    Job.find({ title: searchRegex, isActive: true }).select("title").limit(5),
  ]);

  productTitles.forEach(p => suggestions.add(p.title));
  roomTitles.forEach(r => suggestions.add(r.title));
  serviceTitles.forEach(s => suggestions.add(s.title));
  jobTitles.forEach(j => suggestions.add(j.title));

  res.status(200).json({
    success: true,
    suggestions: Array.from(suggestions).slice(0, 10),
  });
});

module.exports = {
  globalSearch,
  getSearchSuggestions,
};
