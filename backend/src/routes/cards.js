import express from 'express';
import { query, queryOne, queryMany, pool } from '../lib/db.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth, requireLider } from '../middleware/auth.js';

const router = express.Router();

const VALID_ROLES = ['lider', 'sub_lider', 'comandante', 'ayudante', 'miembro'];

/**
 * GET /api/cards
 * Lista las tarjetas que el usuario actual puede ver
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Si es líder, ve todas. Si no, filtra por permisos.
    let cards;
    if (req.user.role === 'lider') {
      cards = await queryMany(
        `SELECT c.*,
          COALESCE(
            ARRAY(SELECT user_id FROM card_user_access WHERE card_id = c.id),
            ARRAY[]::UUID[]
          ) AS allowed_users
         FROM dashboard_cards c
         ORDER BY orden ASC, created_at ASC`
      );
    } else {
      cards = await queryMany(
        `SELECT c.*,
          ARRAY[]::UUID[] AS allowed_users
         FROM dashboard_cards c
         WHERE c.is_public = true
            OR $1 = ANY(c.allowed_roles)
            OR EXISTS (
              SELECT 1 FROM card_user_access
              WHERE card_id = c.id AND user_id = $2
            )
         ORDER BY orden ASC, created_at ASC`,
        [req.user.role, req.user.id]
      );
    }

    res.json({ cards });
  } catch (err) {
    console.error('List cards error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cards/:id
 * Detalle de una tarjeta (verifica permisos)
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const card = await queryOne(
      `SELECT c.*,
        COALESCE(
          ARRAY(SELECT user_id FROM card_user_access WHERE card_id = c.id),
          ARRAY[]::UUID[]
        ) AS allowed_users
       FROM dashboard_cards c WHERE id = $1`,
      [req.params.id]
    );

    if (!card) {
      return res.status(404).json({ error: 'Tarjeta no encontrada' });
    }

    // Verificar permisos
    if (req.user.role !== 'lider' && !card.is_public) {
      const roleAllowed = card.allowed_roles?.includes(req.user.role);
      const userAllowed = card.allowed_users?.includes(req.user.id);
      if (!roleAllowed && !userAllowed) {
        return res.status(403).json({ error: 'Sin acceso a esta tarjeta' });
      }
    }

    res.json({ card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/cards (solo líder)
 * Body: { titulo, subtitulo?, imagen_url?, imagen_public_id?, link?,
 *         is_external?, is_coming_soon?, is_public?, allowed_roles?, allowed_users? }
 */
router.post('/', requireAuth, requireLider, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      titulo, subtitulo, imagen_url, imagen_public_id, link,
      is_external = false, is_coming_soon = false,
      is_public = true, allowed_roles = [], allowed_users = []
    } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'titulo requerido' });
    }
    if (allowed_roles.some(r => !VALID_ROLES.includes(r))) {
      return res.status(400).json({ error: 'Rol inválido en allowed_roles' });
    }

    await client.query('BEGIN');

    // Calcular orden = max + 1
    const maxOrder = await client.query(
      'SELECT COALESCE(MAX(orden), 0) AS max FROM dashboard_cards'
    );
    const newOrder = maxOrder.rows[0].max + 1;

    const cardResult = await client.query(
      `INSERT INTO dashboard_cards
       (titulo, subtitulo, imagen_url, imagen_public_id, link,
        is_external, is_coming_soon, is_public, allowed_roles, orden)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        titulo, subtitulo, imagen_url, imagen_public_id, link,
        is_external, is_coming_soon, is_public,
        allowed_roles.length > 0 ? allowed_roles : null,
        newOrder
      ]
    );

    const card = cardResult.rows[0];

    // Insertar accesos por usuario
    if (allowed_users.length > 0) {
      const values = allowed_users
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      await client.query(
        `INSERT INTO card_user_access (card_id, user_id) VALUES ${values}`,
        [card.id, ...allowed_users]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ card: { ...card, allowed_users } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create card error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/cards/:id (solo líder)
 * Actualiza una tarjeta
 */
router.patch('/:id', requireAuth, requireLider, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      titulo, subtitulo, imagen_url, imagen_public_id, link,
      is_external, is_coming_soon, is_public, allowed_roles, allowed_users
    } = req.body;

    await client.query('BEGIN');

    // Si cambian la imagen, borrar la anterior de Cloudinary
    if (imagen_public_id !== undefined) {
      const old = await client.query(
        'SELECT imagen_public_id FROM dashboard_cards WHERE id = $1',
        [id]
      );
      const oldId = old.rows[0]?.imagen_public_id;
      if (oldId && oldId !== imagen_public_id) {
        try {
          await cloudinary.uploader.destroy(oldId);
        } catch (e) {
          console.warn('No se pudo borrar imagen anterior:', e.message);
        }
      }
    }

    // Construir UPDATE dinámico solo con campos presentes
    const fields = [];
    const values = [];
    let i = 1;

    const addField = (name, value) => {
      if (value !== undefined) {
        fields.push(`${name} = $${i++}`);
        values.push(value);
      }
    };

    addField('titulo', titulo);
    addField('subtitulo', subtitulo);
    addField('imagen_url', imagen_url);
    addField('imagen_public_id', imagen_public_id);
    addField('link', link);
    addField('is_external', is_external);
    addField('is_coming_soon', is_coming_soon);
    addField('is_public', is_public);
    if (allowed_roles !== undefined) {
      fields.push(`allowed_roles = $${i++}`);
      values.push(allowed_roles?.length > 0 ? allowed_roles : null);
    }

    let card;
    if (fields.length > 0) {
      values.push(id);
      const result = await client.query(
        `UPDATE dashboard_cards SET ${fields.join(', ')}
         WHERE id = $${i} RETURNING *`,
        values
      );
      card = result.rows[0];
    } else {
      card = (await client.query('SELECT * FROM dashboard_cards WHERE id = $1', [id])).rows[0];
    }

    if (!card) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tarjeta no encontrada' });
    }

    // Si mandaron allowed_users, reemplazar todo el set
    if (allowed_users !== undefined) {
      await client.query('DELETE FROM card_user_access WHERE card_id = $1', [id]);
      if (allowed_users.length > 0) {
        const placeholders = allowed_users
          .map((_, idx) => `($1, $${idx + 2})`)
          .join(', ');
        await client.query(
          `INSERT INTO card_user_access (card_id, user_id) VALUES ${placeholders}`,
          [id, ...allowed_users]
        );
      }
    }

    // Devolver con allowed_users actualizado
    const finalUsers = await client.query(
      'SELECT user_id FROM card_user_access WHERE card_id = $1',
      [id]
    );

    await client.query('COMMIT');
    res.json({
      card: {
        ...card,
        allowed_users: finalUsers.rows.map(r => r.user_id)
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update card error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/cards/reorder (solo líder)
 * Body: { ids: [uuid, uuid, ...] }
 * Reordena las tarjetas según el orden del array
 */
router.patch('/reorder/all', requireAuth, requireLider, async (req, res) => {
  const client = await pool.connect();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids debe ser un array' });
    }

    await client.query('BEGIN');
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        'UPDATE dashboard_cards SET orden = $1 WHERE id = $2',
        [i + 1, ids[i]]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/cards/:id (solo líder)
 */
router.delete('/:id', requireAuth, requireLider, async (req, res) => {
  try {
    const { id } = req.params;

    // Borrar imagen de Cloudinary
    const card = await queryOne(
      'SELECT imagen_public_id FROM dashboard_cards WHERE id = $1',
      [id]
    );
    if (card?.imagen_public_id) {
      try {
        await cloudinary.uploader.destroy(card.imagen_public_id);
      } catch (e) {
        console.warn('No se pudo borrar imagen:', e.message);
      }
    }

    const result = await query('DELETE FROM dashboard_cards WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tarjeta no encontrada' });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
