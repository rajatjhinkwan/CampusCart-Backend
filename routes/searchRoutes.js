// routes/searchRoutes.js
const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");
const handleAsync = require("../utils/handleAsync");

// ----------------------------------
// GLOBAL SEARCH
// ----------------------------------
router.get("/", handleAsync(searchController.globalSearch));

// ----------------------------------
// SEARCH SUGGESTIONS
// ----------------------------------
router.get("/suggestions", handleAsync(searchController.getSearchSuggestions));

module.exports = router;
