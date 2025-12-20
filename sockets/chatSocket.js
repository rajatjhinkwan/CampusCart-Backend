// sockets/chatSocket.js
const { verifyTokenFromSocket } = require('./socketAuth');
const sockets = require('./index'); // to emit centrally if needed

/**
 * Assumptions:
 * - client sends token in handshake query (or auth header)
 * - conversation rooms: `conversation:{conversationId}`
 * - personal rooms: `user:{userId}` (useful to send notification individually)
 */

function register(io) {
  io.of('/chat').on('connection', (socket) => {
    // auth on connection
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = verifyTokenFromSocket(token);
    if (!user) {
      // disconnect unauthenticated sockets
      socket.emit('unauthorized');
      return socket.disconnect(true);
    }

    // put socket into personal room
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);

    // client tells server which conversation rooms to join
    socket.on('joinConversation', ({ conversationId }) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      socket.join(room);
      socket.emit('joinedConversation', { conversationId });
    });

    socket.on('leaveConversation', ({ conversationId }) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      socket.leave(room);
      socket.emit('leftConversation', { conversationId });
    });

    // typing indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      const room = `conversation:${conversationId}`;
      // broadcast to others in the room
      socket.to(room).emit('typing', { conversationId, userId: user.id, isTyping });
    });

    // sendMessage: client sends payload; server should save via REST or a controller call
    // We recommend the client POST to /api/messages (persist) and server emits after persist.
    // But for completeness, we can handle a server-side emit helper event:
    socket.on('sendMessage', ({ conversationId, message }) => {
      if (!conversationId || !message) return;
      // Do not persist here. Instead expect controllers to persist and use sockets.emitTo
      // But emit an optimistic event to the room:
      const payload = {
        conversationId,
        message,
        senderId: user.id,
        tempId: message.tempId || null,
        createdAt: new Date().toISOString(),
      };
      io.of('/chat').to(`conversation:${conversationId}`).emit('newMessage', payload);
      // Also to receiver(s) personal room(s) can be emitted by server after saving.
    });

    // mark as read
    socket.on('messageRead', ({ conversationId, messageId }) => {
      if (!conversationId || !messageId) return;
      const room = `conversation:${conversationId}`;
      io.of('/chat').to(room).emit('messageRead', { conversationId, messageId, userId: user.id });
    });

    // ===========================================
    // WebRTC Signaling Events
    // ===========================================

    // 1. Initiate Call
    socket.on('callUser', ({ userToCall, signalData, from, name, isVideo }) => {
      // Send to the specific user's room
      io.of('/chat').to(`user:${userToCall}`).emit('incomingCall', { 
        signal: signalData, 
        from, 
        name,
        isVideo
      });
    });

    // 2. Answer Call
    socket.on('answerCall', ({ to, signal }) => {
      io.of('/chat').to(`user:${to}`).emit('callAccepted', { signal });
    });

    // 3. ICE Candidate (Trickle ICE)
    socket.on('ice-candidate', ({ to, candidate }) => {
      io.of('/chat').to(`user:${to}`).emit('ice-candidate', { candidate });
    });

    // 4. End Call
    socket.on('endCall', ({ to }) => {
      io.of('/chat').to(`user:${to}`).emit('callEnded');
    });

    // 5. Busy / Reject
    socket.on('rejectCall', ({ to }) => {
        io.of('/chat').to(`user:${to}`).emit('callRejected');
    });
  });
}

module.exports = { register };
