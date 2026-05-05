const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateTokens, authenticate } = require('../middleware/auth');
require('dotenv').config();

const SECRET = process.env.JWT_SECRET || 'energy-monitor-secret';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const user = await User.findOne({ where: { username, isActive: true } });
    if (!user) return res.status(401).json({ error: 'Username atau password salah' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Username atau password salah' });

    const { accessToken, refreshToken } = generateTokens(user);

    return res.json({
      access:  accessToken,
      refresh: refreshToken,
      user: {
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refresh } = req.body;
    if (!refresh) return res.status(400).json({ error: 'Refresh token wajib diisi' });

    const decoded = jwt.verify(refresh, SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'username', 'email', 'role', 'isActive'],
    });

    if (!user || !user.isActive) return res.status(401).json({ error: 'User tidak valid' });

    const { accessToken, refreshToken } = generateTokens(user);
    return res.json({ access: accessToken, refresh: refreshToken });
  } catch {
    return res.status(401).json({ error: 'Refresh token tidak valid atau kadaluarsa' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    id:       req.user.id,
    username: req.user.username,
    email:    req.user.email,
    role:     req.user.role,
  });
});

module.exports = router;
