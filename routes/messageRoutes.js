// FILE: routes/messageRoutes.js
const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

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
router.put("/:messageId", protect, messageController.editMessage);

// Upload message attachments (images)
router.post(
  "/attachments",
  protect,
  upload.array("images", 5),
  messageController.uploadAttachments
);

module.exports = router;
