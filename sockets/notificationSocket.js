// sockets/notificationSocket.js
const { verifyTokenFromSocket } = require('./socketAuth');

function register(io) {
  io.of('/notifications').on('connection', (socket) => {
    // token from handshake
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = verifyTokenFromSocket(token);
    if (!user) {
      socket.emit('unauthorized');
      return socket.disconnect(true);
    }

    const userRoom = `user:${user.id}`;
    socket.join(userRoom);

    // optionally listen for client-ack
    socket.on('notificationSeen', ({ notificationId }) => {
      if (!notificationId) return;
      // Controllers should update DB; we broadcast ack to user's devices
      socket.to(userRoom).emit('notificationSeen', { notificationId });
    });
  });
}

module.exports = { register };
