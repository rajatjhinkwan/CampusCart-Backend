const express = require("express");
const router = express.Router();
const {
    createListing,
    getAllListings,
    getListingById,
    deleteListing,
    updateListing,
} = require("../controllers/listingController");

// auth middleware (your existing middleware)
const { isAuthenticated } = require("../middleware/auth");

// CREATE
router.post("/create", isAuthenticated, createListing);

// GET ALL
router.get("/all", getAllListings);

// GET ONE
router.get("/:id", getListingById);

// UPDATE
router.put("/:id", isAuthenticated, updateListing);

// DELETE
router.delete("/:id", isAuthenticated, deleteListing);

module.exports = router;
