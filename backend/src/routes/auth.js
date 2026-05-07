import express from 'express';
import { query, queryOne } from '../lib/db.js';
import {
  verifyPassword, signToken, hashToken, sessionExpiresAt,
  cookieOptions, COOKIE_NAME
} from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }

    const cleanUsername = username.toLowerCase().trim();

    const user = await queryOne(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [cleanUsername]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = signToken(user.id);
    const tokenHash = hashToken(token);
    const expiresAt = sessionExpiresAt();

    await query(
      `INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        tokenHash,
        expiresAt,
        req.headers['user-agent']?.slice(0, 500) || null,
        req.ip || null
      ]
    );

    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    res.cookie(COOKIE_NAME, token, cookieOptions());
    res.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) {
      const tokenHash = hashToken(token);
      await query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    }
    res.clearCookie(COOKIE_NAME, cookieOptions());
    res.json({ ok: true });
  } catch (err) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
    res.json({ ok: true });
  }
});

router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM sessions WHERE user_id = $1', [req.user.id]);
    res.clearCookie(COOKIE_NAME, cookieOptions());
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
