const Conversation = require("../models/conversationModel");
const handleAsync = require("../utils/handleAsync");

/////////////////////////////////////////////////////////////
// 🌟 SAFE GET USER ID (WORKS FOR BOTH _id AND id)
/////////////////////////////////////////////////////////////
const getUserId = (user) => user._id || user.id;

/////////////////////////////////////////////////////////////
// 1) CREATE OR RETURN EXISTING CONVERSATION
/////////////////////////////////////////////////////////////
exports.createConversation = handleAsync(async (req, res) => {
  const senderId = getUserId(req.user);
  const { receiverId, contextType, contextId, productId } = req.body;

  if (!receiverId) {
    return res.status(400).json({ message: "receiverId is required" });
  }

  // Use productId as contextId if contextId is missing (backward compatibility)
  const effectiveContextId = contextId || productId;
  const effectiveContextType = contextType || (productId ? "Product" : null);

  // Safety: Prevent duplicate conversations
  // If context is provided, we should probably check if conversation exists FOR THIS CONTEXT?
  // Or just one conversation per user pair?
  // Usually, marketplaces allow separate chats for separate items.
  // But standard chat apps merge them.
  // The user requirement implies negotiation for specific items.
  // If I have one chat per user-pair, the context might get overwritten or ambiguous if they discuss multiple items.
  // "Proper negotiation UI" suggests per-item context.
  // Let's try to find conversation with same participants AND same context if context exists.
  
  let query = {
    participants: { $all: [senderId, receiverId] },
  };

  let existingConv = await Conversation.findOne(query)
    .populate("participants", "name email avatar")
    .populate("contextId") // Auto-populates based on contextType
    .populate({
      path: "lastMessage",
      populate: [
        { path: "sender", select: "name email avatar" },
        { path: "receiver", select: "name email avatar" }, // ⭐ SAFE addition
      ],
    });

  if (existingConv) {
    return res.status(200).json(existingConv);
  }

  // Create new conversation
  const newConv = await Conversation.create({
    participants: [senderId, receiverId],
    contextType: effectiveContextType,
    contextId: effectiveContextId
  });

  const finalConv = await Conversation.findById(newConv._id)
    .populate("participants", "name email avatar")
    .populate("contextId")
    .populate({
      path: "lastMessage",
      populate: [
        { path: "sender", select: "name email avatar" },
        { path: "receiver", select: "name email avatar" }, // ⭐ SAFE addition
      ],
    });

  // Socket notify
  const io = req.app.get("io");
  if (io) {
    io.to(receiverId.toString()).emit("newConversation", finalConv);
  }

  return res.status(201).json(finalConv);
});

/////////////////////////////////////////////////////////////
// 2) GET ALL USER CONVERSATIONS
/////////////////////////////////////////////////////////////
exports.getUserConversations = handleAsync(async (req, res) => {
  const userId = getUserId(req.user);

  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate("participants", "name email avatar")
    .populate("contextId")
    .populate({
      path: "lastMessage",
      populate: [
        { path: "sender", select: "name email avatar" },
        { path: "receiver", select: "name email avatar" }, // ⭐ SAFE addition
      ],
    })
    .sort({ updatedAt: -1 });

  return res.status(200).json(conversations);
});

/////////////////////////////////////////////////////////////
// 3) GET SINGLE CONVERSATION BY ID
/////////////////////////////////////////////////////////////
exports.getConversationById = handleAsync(async (req, res) => {
  const { conversationId } = req.params;
  const userId = getUserId(req.user);

  const conv = await Conversation.findById(conversationId)
    .populate("participants", "name email avatar")
    .populate("contextId")
    .populate({
      path: "lastMessage",
      populate: [
        { path: "sender", select: "name email avatar" },
        { path: "receiver", select: "name email avatar" }, // ⭐ SAFE addition
      ],
    });

  if (!conv) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  // Authorization check
  const isParticipant = conv.participants.some(
    (p) => p._id.toString() === userId.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({ message: "Not authorized" });
  }

  return res.status(200).json(conv);
});

/////////////////////////////////////////////////////////////
// 4) MARK CONVERSATION AS READ
/////////////////////////////////////////////////////////////
exports.markConversationRead = handleAsync(async (req, res) => {
  const { conversationId } = req.params;
  const userId = getUserId(req.user);

  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const io = req.app.get("io");
  if (io) {
    io.to(conversationId.toString()).emit("conversationRead", {
      conversationId,
      readByUserId: userId,
    });
  }

  return res.status(200).json({ message: "Conversation marked as read" });
});

/////////////////////////////////////////////////////////////
// 5) DELETE CONVERSATION
/////////////////////////////////////////////////////////////
exports.deleteConversation = handleAsync(async (req, res) => {
  const { conversationId } = req.params;
  const userId = getUserId(req.user);

  const conv = await Conversation.findById(conversationId);
  if (!conv) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  const isParticipant = conv.participants.some(
    (p) => p.toString() === userId.toString()
  );

  if (!isParticipant) {
    return res.status(403).json({ message: "Not authorized" });
  }

  await Conversation.findByIdAndDelete(conversationId);

  const io = req.app.get("io");
  if (io) {
    conv.participants.forEach((uid) => {
      io.to(uid.toString()).emit("conversationDeleted", {
        conversationId,
      });
    });
  }

  return res.status(200).json({ message: "Conversation deleted successfully" });
});
