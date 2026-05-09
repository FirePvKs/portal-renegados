import express from 'express';
import { query, queryOne, queryMany } from '../lib/db.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../lib/permissions.js';

const router = express.Router();

router.get('/', optionalAuth, async (req, res) => {
  try {
    const factions = await queryMany(
      `SELECT * FROM factions ORDER BY nombre ASC`
    );
    res.json({ factions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const faction = await queryOne(
      `SELECT * FROM factions WHERE id = $1`,
      [req.params.id]
    );
    if (!faction) {
      return res.status(404).json({ error: 'Facción no encontrada' });
    }

    const players = await queryMany(
      `SELECT id, nombre, imagen_url, ultimo_nivel
       FROM players WHERE faction_id = $1 ORDER BY nombre ASC`,
      [req.params.id]
    );

    res.json({ faction, players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_FACTIONS),
  async (req, res) => {
    try {
      const { nombre, descripcion, color, imagen_url, imagen_public_id } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Nombre requerido' });
      }
      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return res.status(400).json({ error: 'Color debe ser hex (#rrggbb)' });
      }

      const cleanNombre = nombre.trim();

      const existing = await queryOne(
        'SELECT id FROM factions WHERE LOWER(nombre) = LOWER($1)',
        [cleanNombre]
      );
      if (existing) {
        return res.status(409).json({ error: 'Ya existe una facción con ese nombre' });
      }

      const faction = await queryOne(
        `INSERT INTO factions (nombre, descripcion, color, imagen_url, imagen_public_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [cleanNombre, descripcion || null, color || null,
         imagen_url || null, imagen_public_id || null]
      );

      res.status(201).json({ faction });
    } catch (err) {
      console.error('Create faction error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_FACTIONS),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, descripcion, color, imagen_url, imagen_public_id } = req.body;

      if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
        return res.status(400).json({ error: 'Color debe ser hex (#rrggbb)' });
      }

      if (imagen_public_id !== undefined) {
        const old = await queryOne(
          'SELECT imagen_public_id FROM factions WHERE id = $1',
          [id]
        );
        if (old?.imagen_public_id && old.imagen_public_id !== imagen_public_id) {
          try { await cloudinary.uploader.destroy(old.imagen_public_id); }
          catch (e) { console.warn('Error borrando imagen:', e.message); }
        }
      }

      const fields = [];
      const values = [];
      let i = 1;
      const add = (col, val) => {
        if (val !== undefined) {
          fields.push(`${col} = $${i++}`);
          values.push(val);
        }
      };

      add('nombre', nombre?.trim());
      add('descripcion', descripcion);
      add('color', color);
      add('imagen_url', imagen_url);
      add('imagen_public_id', imagen_public_id);

      if (fields.length === 0) {
        return res.status(400).json({ error: 'Nada que actualizar' });
      }

      values.push(id);
      const faction = await queryOne(
        `UPDATE factions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        values
      );

      if (!faction) {
        return res.status(404).json({ error: 'Facción no encontrada' });
      }

      res.json({ faction });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ya existe una facción con ese nombre' });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_FACTIONS),
  async (req, res) => {
    try {
      const { id } = req.params;

      const faction = await queryOne(
        'SELECT imagen_public_id FROM factions WHERE id = $1',
        [id]
      );
      if (faction?.imagen_public_id) {
        try { await cloudinary.uploader.destroy(faction.imagen_public_id); }
        catch (e) { console.warn('Error borrando imagen:', e.message); }
      }

      const result = await query('DELETE FROM factions WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Facción no encontrada' });
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
