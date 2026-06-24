const express = require("express");
const router = express.Router();

const convController = require("../controllers/conversationController");
const { protect } = require("../middleware/authMiddleware");

/* -------------------------------------------
   CONVERSATION ROUTES (All Protected)
-------------------------------------------- */

// Create or return existing conversation
router.post("/", protect, convController.createConversation);

// Get all conversations of logged user
router.get("/", protect, convController.getUserConversations);

// Get single conversation by ID
router.get("/:conversationId", protect, convController.getConversationById);

// Mark conversation as read
router.put("/:conversationId/read", protect, convController.markConversationRead);

// Delete conversation
router.delete("/:conversationId", protect, convController.deleteConversation);

module.exports = router;
