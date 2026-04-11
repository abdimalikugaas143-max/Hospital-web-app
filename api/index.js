// Vercel serverless entry point
// All /api/* requests are routed here by vercel.json
require('dotenv').config();
const app = require('../backend/src/app');

module.exports = app;
