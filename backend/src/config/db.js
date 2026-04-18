// Uses @neondatabase/serverless in production (HTTP-based, no idle TCP connections)
// Falls back to standard pg Pool for local development.
// When DATABASE_URL is not set, demo-data.js intercepts all routes — pool is never queried.
// dotenv is loaded by server.js / api/index.js before this module is required.

let pool;

if (!process.env.DATABASE_URL) {
  // No database configured — demo mode handles all requests, pool is never used
  pool = { query: () => Promise.reject(new Error('No DATABASE_URL configured')) };
} else if (process.env.NODE_ENV === 'production' || process.env.NEON_DATABASE_URL) {
  // Serverless-safe: Neon's HTTP driver — no persistent connections
  const { Pool } = require('@neondatabase/serverless');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  // Local dev: standard pg Pool with connection reuse
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 10,
  });

  pool.on('connect', () => { console.log('Connected to PostgreSQL'); });
  pool.on('error', (err) => { console.error('Unexpected DB error:', err); });
}

module.exports = pool;
