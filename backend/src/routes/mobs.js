import express from 'express';
import { query, queryOne, queryMany, pool } from '../lib/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../lib/permissions.js';
import cloudinary from '../lib/cloudinary.js';

const router = express.Router();

// ─── GET /api/mobs ────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const mobs = await queryMany(
      `SELECT m.*, 
        json_agg(json_build_object('id', s.id, 'pos_x', s.pos_x, 'pos_y', s.pos_y, 'notas', s.notas)
          ORDER BY s.created_at ASC) FILTER (WHERE s.id IS NOT NULL) AS spawns
       FROM mobs m
       LEFT JOIN mob_spawns s ON s.mob_id = m.id
       GROUP BY m.id
       ORDER BY m.nombre ASC`
    );
    res.json({ mobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/mobs/:id ────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const mob = await queryOne(
      `SELECT m.*,
        json_agg(json_build_object('id', s.id, 'pos_x', s.pos_x, 'pos_y', s.pos_y, 'notas', s.notas)
          ORDER BY s.created_at ASC) FILTER (WHERE s.id IS NOT NULL) AS spawns
       FROM mobs m
       LEFT JOIN mob_spawns s ON s.mob_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [req.params.id]
    );
    if (!mob) return res.status(404).json({ error: 'Mob no encontrado' });
    res.json({ mob });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/mobs ───────────────────────────────────────────────────────────
router.post('/', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { nombre, descripcion, nivel, xp, imagen_url, imagen_public_id, spawns } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    const result = await client.query(
      `INSERT INTO mobs (nombre, descripcion, nivel, xp, imagen_url, imagen_public_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre.trim(), descripcion || null, nivel || null, xp || null,
       imagen_url || null, imagen_public_id || null, req.user.id]
    );
    const mob = result.rows[0];

    if (spawns?.length) {
      for (const s of spawns) {
        await client.query(
          'INSERT INTO mob_spawns (mob_id, pos_x, pos_y, notas) VALUES ($1,$2,$3,$4)',
          [mob.id, s.pos_x, s.pos_y, s.notas || null]
        );
      }
    }

    await client.query('COMMIT');
    const full = await queryOne(
      `SELECT m.*, json_agg(json_build_object('id',s.id,'pos_x',s.pos_x,'pos_y',s.pos_y,'notas',s.notas) ORDER BY s.created_at ASC) FILTER (WHERE s.id IS NOT NULL) AS spawns FROM mobs m LEFT JOIN mob_spawns s ON s.mob_id=m.id WHERE m.id=$1 GROUP BY m.id`,
      [mob.id]
    );
    res.status(201).json({ mob: full });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/mobs/:id ──────────────────────────────────────────────────────
router.patch('/:id', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { nombre, descripcion, nivel, xp, imagen_url, imagen_public_id, spawns } = req.body;

    const existing = await queryOne('SELECT id, imagen_public_id FROM mobs WHERE id=$1', [id]);
    if (!existing) return res.status(404).json({ error: 'Mob no encontrado' });

    // Borrar imagen anterior si cambió
    if (imagen_public_id !== existing.imagen_public_id && existing.imagen_public_id) {
      await cloudinary.uploader.destroy(existing.imagen_public_id).catch(() => {});
    }

    await client.query(
      `UPDATE mobs SET nombre=$1, descripcion=$2, nivel=$3, xp=$4,
       imagen_url=$5, imagen_public_id=$6, updated_at=NOW() WHERE id=$7`,
      [nombre.trim(), descripcion || null, nivel || null, xp || null,
       imagen_url || null, imagen_public_id || null, id]
    );

    // Reemplazar spawns
    await client.query('DELETE FROM mob_spawns WHERE mob_id=$1', [id]);
    if (spawns?.length) {
      for (const s of spawns) {
        await client.query(
          'INSERT INTO mob_spawns (mob_id, pos_x, pos_y, notas) VALUES ($1,$2,$3,$4)',
          [id, s.pos_x, s.pos_y, s.notas || null]
        );
      }
    }

    await client.query('COMMIT');
    const full = await queryOne(
      `SELECT m.*, json_agg(json_build_object('id',s.id,'pos_x',s.pos_x,'pos_y',s.pos_y,'notas',s.notas) ORDER BY s.created_at ASC) FILTER (WHERE s.id IS NOT NULL) AS spawns FROM mobs m LEFT JOIN mob_spawns s ON s.mob_id=m.id WHERE m.id=$1 GROUP BY m.id`,
      [id]
    );
    res.json({ mob: full });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/mobs/:id ─────────────────────────────────────────────────────
router.delete('/:id', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  try {
    const mob = await queryOne('SELECT imagen_public_id FROM mobs WHERE id=$1', [req.params.id]);
    if (mob?.imagen_public_id) {
      await cloudinary.uploader.destroy(mob.imagen_public_id).catch(() => {});
    }
    await query('DELETE FROM mobs WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
