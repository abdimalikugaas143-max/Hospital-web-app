// Vercel serverless entry point — all /api/* requests route here
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const app = require('../backend/src/app');

module.exports = app;
