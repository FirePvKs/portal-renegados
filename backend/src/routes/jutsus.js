import express from 'express';
import { query, queryOne, queryMany } from '../lib/db.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../lib/permissions.js';

const router = express.Router();

const VALID_RANGOS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];

/**
 * GET /api/jutsus
 * Cualquier autenticado puede ver el catálogo
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const jutsus = await queryMany(
      `SELECT * FROM jutsus_catalog ORDER BY nombre ASC`
    );
    res.json({ jutsus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/jutsus/:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const jutsu = await queryOne(
      `SELECT * FROM jutsus_catalog WHERE id = $1`,
      [req.params.id]
    );
    if (!jutsu) {
      return res.status(404).json({ error: 'Jutsu no encontrado' });
    }
    res.json({ jutsu });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jutsus (crear)
 */
router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_JUTSUS),
  async (req, res) => {
    try {
      const {
        nombre, descripcion, rango, tipo,
        imagen_url, imagen_public_id
      } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Nombre requerido' });
      }
      if (rango && !VALID_RANGOS.includes(rango)) {
        return res.status(400).json({ error: 'Rango inválido' });
      }

      const cleanNombre = nombre.trim();

      const existing = await queryOne(
        'SELECT id FROM jutsus_catalog WHERE LOWER(nombre) = LOWER($1)',
        [cleanNombre]
      );
      if (existing) {
        return res.status(409).json({ error: 'Ya existe un jutsu con ese nombre' });
      }

      const jutsu = await queryOne(
        `INSERT INTO jutsus_catalog
         (nombre, descripcion, rango, tipo, imagen_url, imagen_public_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [cleanNombre, descripcion || null, rango || null, tipo || null,
         imagen_url || null, imagen_public_id || null]
      );

      res.status(201).json({ jutsu });
    } catch (err) {
      console.error('Create jutsu error:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * PATCH /api/jutsus/:id
 */
router.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_JUTSUS),
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        nombre, descripcion, rango, tipo,
        imagen_url, imagen_public_id
      } = req.body;

      if (rango && !VALID_RANGOS.includes(rango)) {
        return res.status(400).json({ error: 'Rango inválido' });
      }

      // Si cambia imagen, borrar la anterior
      if (imagen_public_id !== undefined) {
        const old = await queryOne(
          'SELECT imagen_public_id FROM jutsus_catalog WHERE id = $1',
          [id]
        );
        if (old?.imagen_public_id && old.imagen_public_id !== imagen_public_id) {
          try { await cloudinary.uploader.destroy(old.imagen_public_id); }
          catch (e) { console.warn('No se pudo borrar imagen anterior:', e.message); }
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
      add('rango', rango);
      add('tipo', tipo);
      add('imagen_url', imagen_url);
      add('imagen_public_id', imagen_public_id);

      if (fields.length === 0) {
        return res.status(400).json({ error: 'Nada que actualizar' });
      }

      values.push(id);
      const jutsu = await queryOne(
        `UPDATE jutsus_catalog SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
        values
      );

      if (!jutsu) {
        return res.status(404).json({ error: 'Jutsu no encontrado' });
      }

      res.json({ jutsu });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un jutsu con ese nombre' });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * DELETE /api/jutsus/:id
 */
router.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_JUTSUS),
  async (req, res) => {
    try {
      const { id } = req.params;

      const jutsu = await queryOne(
        'SELECT imagen_public_id FROM jutsus_catalog WHERE id = $1',
        [id]
      );

      if (jutsu?.imagen_public_id) {
        try { await cloudinary.uploader.destroy(jutsu.imagen_public_id); }
        catch (e) { console.warn('No se pudo borrar imagen:', e.message); }
      }

      const result = await query('DELETE FROM jutsus_catalog WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Jutsu no encontrado' });
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
