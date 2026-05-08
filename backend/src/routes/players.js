import express from 'express';
import { query, queryOne, queryMany, pool } from '../lib/db.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../lib/permissions.js';

const router = express.Router();

/**
 * GET /api/players
 * Cualquier autenticado puede ver la lista (libro bingo)
 * Query params opcionales: ?faction=uuid&search=texto
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { faction, search } = req.query;

    const conditions = [];
    const values = [];
    let i = 1;

    if (faction) {
      conditions.push(`p.faction_id = $${i++}`);
      values.push(faction);
    }
    if (search) {
      conditions.push(`p.nombre ILIKE $${i++}`);
      values.push(`%${search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const players = await queryMany(
      `SELECT p.*,
        f.nombre AS faction_nombre,
        f.color AS faction_color
       FROM players p
       LEFT JOIN factions f ON f.id = p.faction_id
       ${where}
       ORDER BY p.nombre ASC`,
      values
    );

    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/players/:id
 * Detalle completo + jutsus + facción
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const player = await queryOne(
      `SELECT p.*,
        f.nombre AS faction_nombre,
        f.color AS faction_color,
        f.imagen_url AS faction_imagen
       FROM players p
       LEFT JOIN factions f ON f.id = p.faction_id
       WHERE p.id = $1`,
      [id]
    );

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    const jutsus = await queryMany(
      `SELECT j.*, pj.notas AS asignacion_notas
       FROM player_jutsus pj
       JOIN jutsus_catalog j ON j.id = pj.jutsu_id
       WHERE pj.player_id = $1
       ORDER BY j.rango DESC, j.nombre ASC`,
      [id]
    );

    res.json({ player, jutsus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/players
 * Body: {
 *   nombre, imagen_url?, imagen_public_id?,
 *   ultimo_nivel?, ultimo_prestigio?, faction_id?,
 *   notas?, jutsu_ids?: [uuid]
 * }
 */
router.post(
  '/',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_PLAYERS),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        nombre, imagen_url, imagen_public_id,
        ultimo_nivel, ultimo_prestigio, faction_id,
        notas, jutsu_ids = []
      } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ error: 'Nombre requerido' });
      }

      const cleanNombre = nombre.trim();

      await client.query('BEGIN');

      // Verificar nombre único (case-insensitive)
      const existing = await client.query(
        'SELECT id FROM players WHERE LOWER(nombre) = LOWER($1)',
        [cleanNombre]
      );
      if (existing.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Ya existe un jugador con ese nombre' });
      }

      const result = await client.query(
        `INSERT INTO players
         (nombre, imagen_url, imagen_public_id, ultimo_nivel, ultimo_prestigio,
          faction_id, notas, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          cleanNombre,
          imagen_url || null,
          imagen_public_id || null,
          ultimo_nivel ?? null,
          ultimo_prestigio ?? null,
          faction_id || null,
          notas || null,
          req.user.id
        ]
      );

      const player = result.rows[0];

      if (jutsu_ids.length > 0) {
        const placeholders = jutsu_ids.map((_, idx) => `($1, $${idx + 2})`).join(', ');
        await client.query(
          `INSERT INTO player_jutsus (player_id, jutsu_id) VALUES ${placeholders}`,
          [player.id, ...jutsu_ids]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({ player });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Create player error:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

/**
 * PATCH /api/players/:id
 */
router.patch(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_PLAYERS),
  async (req, res) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const {
        nombre, imagen_url, imagen_public_id,
        ultimo_nivel, ultimo_prestigio, faction_id,
        notas, jutsu_ids, valoracion
      } = req.body;

      await client.query('BEGIN');

      // Si cambia imagen, borrar la anterior
      if (imagen_public_id !== undefined) {
        const old = await client.query(
          'SELECT imagen_public_id FROM players WHERE id = $1',
          [id]
        );
        const oldId = old.rows[0]?.imagen_public_id;
        if (oldId && oldId !== imagen_public_id) {
          try { await cloudinary.uploader.destroy(oldId); }
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
      add('imagen_url', imagen_url);
      add('imagen_public_id', imagen_public_id);
      add('ultimo_nivel', ultimo_nivel);
      add('ultimo_prestigio', ultimo_prestigio);
      add('faction_id', faction_id);
      add('notas', notas);
      add('valoracion', valoracion);

      let player;
      if (fields.length > 0) {
        values.push(id);
        const result = await client.query(
          `UPDATE players SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
          values
        );
        player = result.rows[0];
      } else {
        player = (await client.query('SELECT * FROM players WHERE id = $1', [id])).rows[0];
      }

      if (!player) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Jugador no encontrado' });
      }

      // Si mandan jutsu_ids, reemplazar set completo
      if (jutsu_ids !== undefined) {
        await client.query('DELETE FROM player_jutsus WHERE player_id = $1', [id]);
        if (jutsu_ids.length > 0) {
          const placeholders = jutsu_ids.map((_, idx) => `($1, $${idx + 2})`).join(', ');
          await client.query(
            `INSERT INTO player_jutsus (player_id, jutsu_id) VALUES ${placeholders}`,
            [id, ...jutsu_ids]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ player });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Ya existe un jugador con ese nombre' });
      }
      console.error('Update player error:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

/**
 * DELETE /api/players/:id
 */
router.delete(
  '/:id',
  requireAuth,
  requirePermission(PERMISSIONS.MANAGE_PLAYERS),
  async (req, res) => {
    try {
      const { id } = req.params;

      const player = await queryOne(
        'SELECT imagen_public_id FROM players WHERE id = $1',
        [id]
      );
      if (player?.imagen_public_id) {
        try { await cloudinary.uploader.destroy(player.imagen_public_id); }
        catch (e) { console.warn('Error borrando imagen:', e.message); }
      }

      const result = await query('DELETE FROM players WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Jugador no encontrado' });
      }

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
