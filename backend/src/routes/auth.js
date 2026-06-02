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
        telegramChatId: user.telegramChatId,
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
    telegramChatId: req.user.telegramChatId,
  });
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, email, telegramChatId } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (username && username !== user.username) {
      const exists = await User.findOne({ where: { username } });
      if (exists) return res.status(400).json({ message: 'Username sudah digunakan' });
    }
    
    await user.update({ username, email, telegramChatId });
    res.json({ message: 'Profil berhasil diperbarui', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await User.findByPk(req.user.id);
    
    const valid = await user.comparePassword(current_password);
    if (!valid) return res.status(400).json({ message: 'Password saat ini salah' });
    
    user.password = new_password; // akan di-hash oleh hook beforeUpdate
    await user.save();
    
    res.json({ message: 'Password berhasil diubah' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
