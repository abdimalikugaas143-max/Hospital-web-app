const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

function initSocket(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('No token provided'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (${socket.user?.role})`);

    // Join department room
    socket.on('join:department', (departmentId) => {
      socket.join(`dept_${departmentId}`);
      console.log(`Socket ${socket.id} joined dept_${departmentId}`);
    });

    // Leave department room
    socket.on('leave:department', (departmentId) => {
      socket.leave(`dept_${departmentId}`);
    });

    // Join general hospital room
    socket.on('join:hospital', () => {
      socket.join('hospital');
    });

    // Queue update broadcast
    socket.on('queue:broadcast', (data) => {
      if (['receptionist', 'admin'].includes(socket.user?.role)) {
        io.to(`dept_${data.departmentId}`).emit('queue:update', data);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initSocket };
