// Uses @neondatabase/serverless in production (HTTP-based, no idle TCP connections)
// Falls back to standard pg Pool for local development
require('dotenv').config();

let pool;

if (process.env.NODE_ENV === 'production' || process.env.NEON_DATABASE_URL) {
  // Serverless-safe: Neon's HTTP driver — no persistent connections
  const { Pool } = require('@neondatabase/serverless');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
} else {
  // Local dev: standard pg Pool with connection reuse
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
    max: 10,
  });

  pool.on('connect', () => {
    console.log('Connected to PostgreSQL');
  });

  pool.on('error', (err) => {
    console.error('Unexpected DB error:', err);
  });
}

module.exports = pool;
