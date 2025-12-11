// FILE: routes/messageRoutes.js
const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, messageController.sendMessage);

router.get(
   "/conversation/:conversationId",
   protect,
   messageController.getMessagesForConversation
);

router.put(
   "/conversation/:conversationId/read",
   protect,
   messageController.markRead
);

router.delete("/:messageId", protect, messageController.deleteMessage);

module.exports = router;
