const jwt = require('jsonwebtoken');
const { User } = require('../models');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'energy-monitor-secret';

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'email', 'role', 'isActive'],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User tidak valid atau nonaktif' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token kadaluarsa', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token tidak valid' });
  }
};

// Admin only
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang dapat melakukan ini.' });
  }
  next();
};

// Generate tokens
const generateTokens = (user) => {
  const payload = { id: user.id, username: user.username, role: user.role };

  const accessToken = jwt.sign(payload, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

  const refreshToken = jwt.sign({ id: user.id }, SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return { accessToken, refreshToken };
};

module.exports = { authenticate, requireAdmin, generateTokens };
