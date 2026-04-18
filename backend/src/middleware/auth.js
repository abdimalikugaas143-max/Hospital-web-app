const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const demo = require('../demo-data');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'demo_jwt_secret_key';
    const decoded = jwt.verify(token, secret);

    // Demo mode — resolve user from in-memory store
    if (demo.demoMode) {
      const user = await demo.findUserById(decoded.userId);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      return next();
    }

    const result = await pool.query(
      'SELECT id, name, email, role, phone, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = { authenticate };
