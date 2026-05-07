import express from 'express';
import { query, queryOne, queryMany } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth, requireLider } from '../middleware/auth.js';

const router = express.Router();

const VALID_ROLES = ['lider', 'sub_lider', 'comandante', 'ayudante', 'miembro'];

router.get('/users', requireAuth, requireLider, async (req, res) => {
  try {
    const users = await queryMany(
      `SELECT id, username, role, avatar_url, banner_url,
              nivel, prestigio, last_login_at, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', requireAuth, requireLider, async (req, res) => {
  try {
    const { username, password, role = 'miembro' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password requeridos' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        error: 'Username debe tener 3-20 caracteres (letras, números, _)'
      });
    }

    const cleanUsername = username.toLowerCase().trim();

    const existing = await queryOne(
      'SELECT id FROM users WHERE username = $1',
      [cleanUsername]
    );
    if (existing) {
      return res.status(409).json({ error: 'Ese username ya existe' });
    }

    const hash = await hashPassword(password);

    const user = await queryOne(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, nivel, prestigio, created_at`,
      [cleanUsername, hash, role]
    );

    res.status(201).json({ user });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/role', requireAuth, requireLider, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (req.user.id === id && role !== 'lider') {
      const result = await queryOne(
        `SELECT COUNT(*)::int AS count FROM users WHERE role = 'lider'`
      );
      if (result.count === 1) {
        return res.status(400).json({
          error: 'No puedes quitarte el rol, eres el único líder'
        });
      }
    }

    const user = await queryOne(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, username, role`,
      [role, id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/password', requireAuth, requireLider, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
    }

    const hash = await hashPassword(password);

    const result = await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await query('DELETE FROM sessions WHERE user_id = $1', [id]);

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', requireAuth, requireLider, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id === id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }

    try {
      await cloudinary.api.delete_resources_by_prefix(`shinobi/users/${id}/`);
    } catch (cloudErr) {
      console.warn('No se pudieron borrar imágenes:', cloudErr.message);
    }

    const result = await query('DELETE FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
