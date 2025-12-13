// routes/searchRoutes.js
const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");
const handleAsync = require("../utils/handleAsync");

// ----------------------------------
// SEARCH SUGGESTIONS
// ----------------------------------
router.get("/suggestions", handleAsync(searchController.getSearchSuggestions));

module.exports = router;
