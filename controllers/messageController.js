// FILE: controllers/messageController.js
const Message = require("../models/messageModel");
const Conversation = require("../models/conversationModel");
const handleAsync = require("../utils/handleAsync");

const getUserId = (user) => user._id || user.id;

/////////////////////////////////////////////////////////////
// 1) SEND A MESSAGE
/////////////////////////////////////////////////////////////
exports.sendMessage = handleAsync(async (req, res) => {
  const senderId = getUserId(req.user);

  let {
    conversationId,
    recipientId,
    text,
    content,
    attachments
  } = req.body;

  // Normalize message content to ONE variable
  const message = text || content;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Message text is required" });
  }

  let conversation;

  // If conversation ID provided
  if (conversationId) {
    conversation = await Conversation.findById(conversationId);
  }
  // Else search or create with recipient
  else if (recipientId) {
    conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId],
      });
    }
  } else {
    return res.status(400).json({
      message: "Either conversationId or recipientId is required",
    });
  }

  if (!conversation)
    return res.status(404).json({ message: "Conversation not found" });

  const receiverId =
    recipientId ||
    conversation.participants.find(
      (p) => p.toString() !== senderId.toString()
    );

  const newMessage = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    receiver: receiverId,
    content: message,
    attachments: attachments || [],
    isRead: false,
  });

  const populatedMessage = await newMessage.populate([
    { path: "sender", select: "name email avatar" },
    { path: "receiver", select: "name email avatar" }
  ]);

  conversation.lastMessage = newMessage._id;
  conversation.updatedAt = Date.now();
  await conversation.save();

  const io = req.app.get("io");
  if (io)
    io.of('/chat').to(`conversation:${conversation._id.toString()}`).emit("newMessage", populatedMessage);

  res.status(201).json(populatedMessage);
});


/////////////////////////////////////////////////////////////
// 2) GET MESSAGES OF A CONVERSATION
/////////////////////////////////////////////////////////////
exports.getMessagesForConversation = handleAsync(async (req, res) => {
  const { conversationId } = req.params;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const skip = (page - 1) * limit;

  const messages = await Message.find({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("sender", "name email avatar")
    .populate("receiver", "name email avatar");

  res.json({ messages: messages.reverse() }); // old → new
});

/////////////////////////////////////////////////////////////
// 3) MARK MESSAGES AS READ
/////////////////////////////////////////////////////////////
exports.markRead = handleAsync(async (req, res) => {
  const { conversationId } = req.params;
  const userId = getUserId(req.user);

  await Message.updateMany(
    {
      conversation: conversationId,
      receiver: userId, // ⭐ FIXED
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  const io = req.app.get("io");
  if (io)
    io.of('/chat').to(`conversation:${conversationId}`).emit("messagesRead", { conversationId, userId });

  res.json({ message: "Messages marked as read" });
});

/////////////////////////////////////////////////////////////
// 4) DELETE A MESSAGE
/////////////////////////////////////////////////////////////
exports.deleteMessage = handleAsync(async (req, res) => {
  const { messageId } = req.params;
  const userId = getUserId(req.user);

  const message = await Message.findById(messageId);
  if (!message)
    return res.status(404).json({ message: "Message not found" });

  if (message.sender.toString() !== userId.toString()) {
    return res.status(403).json({ message: "Not authorized" });
  }

  const conversationId = message.conversation;

  await Message.findByIdAndDelete(messageId);

  const conversation = await Conversation.findById(conversationId);
  if (conversation && conversation.lastMessage?.toString() === messageId) {
    const latest = await Message.findOne({ conversation }).sort({
      createdAt: -1,
    });
    conversation.lastMessage = latest ? latest._id : null;
    await conversation.save();
  }

  const io = req.app.get("io");
  if (io)
    io.of('/chat')
      .to(`conversation:${conversationId.toString()}`)
      .emit("messageDeleted", { messageId });

  res.status(200).json({ message: "Message deleted" });
});
