const express = require("express");
const router = express.Router();

const roomController = require("../controllers/roomController");
const auth = require("../middleware/authMiddleware");
const handleAsync = require("../utils/handleAsync");
const upload = require("../middleware/uploadMiddleware");


// ----------------------------------
// CREATE ROOM (Protected)
// ----------------------------------
router.post("/", auth.protect, upload.array('images', 6), handleAsync(roomController.createRoom));


// ----------------------------------
// GET ALL ROOMS (Filters + Pagination)
// ----------------------------------
router.get("/", handleAsync(roomController.getAllRooms));


// ----------------------------------
// SEARCH ROOMS
// ----------------------------------
router.get("/search", handleAsync(roomController.searchRooms));


// ----------------------------------
// GET ROOMS CREATED BY LOGGED-IN USER
// ----------------------------------
router.get("/seller/my-rooms", auth.protect, handleAsync(roomController.getRoomsBySeller));


// ----------------------------------
// INCREMENT ROOM VIEWS
// ----------------------------------
router.patch("/:id/views", handleAsync(roomController.incrementRoomViews));


// ----------------------------------
// GET ROOM DETAILS BY ID
// ----------------------------------
router.get("/:id", handleAsync(roomController.getRoomById));


// ----------------------------------
// UPDATE ROOM (Protected)
// ----------------------------------
router.put("/:id", auth.protect, handleAsync(roomController.updateRoom));


// ----------------------------------
// DELETE ROOM (Protected)
// ----------------------------------
router.delete("/:id", auth.protect, handleAsync(roomController.deleteRoom));


module.exports = router;
