// sockets/index.js
const chatSocket = require('./chatSocket');
const notificationSocket = require('./notificationSocket');

let ioInstance = null;

function init(io) {
  ioInstance = io;

  // global connection handler (common)
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Optionally use a heartbeat logger for debugging
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, reason);
    });
  });

  // mount specialized handlers
  chatSocket.register(io);
  notificationSocket.register(io);
}

/**
 * Emit helper: emits to a room or to everyone
 * - room can be something like `conversation:{id}` or `user:{userId}`
 */
function emitTo(room, event, payload) {
  if (!ioInstance) return;
  if (room) ioInstance.to(room).emit(event, payload);
  else ioInstance.emit(event, payload);
}

function getIo() {
  return ioInstance;
}

module.exports = {
  init,
  emitTo,
  getIo,
};
