// Local development server — adds Socket.io on top of the Express app
// For production (Vercel), use api/index.js instead
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket/socket');

const server = http.createServer(app);

// Attach Socket.io for local real-time updates
const io = initSocket(server);
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Hospital API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Socket.io: enabled`);
});

module.exports = { app, server };
