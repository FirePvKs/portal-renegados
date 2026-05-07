import express from 'express';
import { query, queryOne, queryMany } from '../lib/db.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const profiles = await queryMany(
      `SELECT id, username, role, avatar_url, banner_url,
              nivel, prestigio, created_at
       FROM users
       ORDER BY nivel DESC, created_at ASC`
    );
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:username', requireAuth, async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();

    const profile = await queryOne(
      `SELECT id, username, role, avatar_url, banner_url,
              nivel, prestigio, bio, created_at
       FROM users WHERE username = $1`,
      [username]
    );

    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    const [jutsus, items] = await Promise.all([
      queryMany('SELECT * FROM jutsus WHERE user_id = $1 ORDER BY created_at DESC', [profile.id]),
      queryMany('SELECT * FROM items_venta WHERE user_id = $1 ORDER BY created_at DESC', [profile.id])
    ]);

    res.json({ profile, jutsus, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { bio } = req.body;

    if (bio === undefined) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }

    const profile = await queryOne(
      `UPDATE users SET bio = $1 WHERE id = $2
       RETURNING id, username, bio`,
      [bio, req.user.id]
    );

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/me/image', requireAuth, async (req, res) => {
  try {
    const { kind, url, public_id } = req.body;

    if (!['avatar', 'banner'].includes(kind)) {
      return res.status(400).json({ error: 'kind debe ser avatar o banner' });
    }
    if (!url || !public_id) {
      return res.status(400).json({ error: 'url y public_id requeridos' });
    }

    const oldPublicId = kind === 'avatar'
      ? req.user.avatar_public_id
      : req.user.banner_public_id;

    if (oldPublicId && oldPublicId !== public_id) {
      try {
        await cloudinary.uploader.destroy(oldPublicId);
      } catch (e) {
        console.warn('No se pudo borrar imagen anterior:', e.message);
      }
    }

    const urlCol = kind === 'avatar' ? 'avatar_url' : 'banner_url';
    const idCol = kind === 'avatar' ? 'avatar_public_id' : 'banner_public_id';

    const profile = await queryOne(
      `UPDATE users SET ${urlCol} = $1, ${idCol} = $2 WHERE id = $3
       RETURNING id, username, avatar_url, banner_url`,
      [url, public_id, req.user.id]
    );

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/me/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const { verifyPassword, hashPassword } = await import('../lib/auth.js');

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password debe tener al menos 6 caracteres' });
    }

    const user = await queryOne(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const valid = await verifyPassword(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Password actual incorrecta' });
    }

    const hash = await hashPassword(new_password);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hash, req.user.id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
