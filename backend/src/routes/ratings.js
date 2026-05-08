import express from 'express';
import { query, queryOne, queryMany } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/players/:id/rating
 * Devuelve promedio, total de votos y la valoración del usuario actual
 */
router.get('/:id/rating', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = await queryOne(
      `SELECT
         ROUND(AVG(rating)::numeric, 1) AS promedio,
         COUNT(*) AS total
       FROM player_ratings
       WHERE player_id = $1`,
      [id]
    );

    const myRating = await queryOne(
      `SELECT rating FROM player_ratings
       WHERE player_id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    res.json({
      promedio: stats?.promedio ? parseFloat(stats.promedio) : null,
      total: parseInt(stats?.total || 0),
      mi_valoracion: myRating?.rating || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/players/:id/rating
 * Body: { rating: 1-10 }
 * Crea o actualiza la valoración del usuario actual
 */
router.post('/:id/rating', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 10 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: 'Valoración debe ser un número entero del 1 al 10' });
    }

    // Verificar que el jugador existe
    const player = await queryOne('SELECT id FROM players WHERE id = $1', [id]);
    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    // Upsert: crear o actualizar valoración
    await query(
      `INSERT INTO player_ratings (player_id, user_id, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (player_id, user_id)
       DO UPDATE SET rating = $3, updated_at = NOW()`,
      [id, req.user.id, rating]
    );

    // Devolver stats actualizadas
    const stats = await queryOne(
      `SELECT
         ROUND(AVG(rating)::numeric, 1) AS promedio,
         COUNT(*) AS total
       FROM player_ratings
       WHERE player_id = $1`,
      [id]
    );

    res.json({
      promedio: parseFloat(stats.promedio),
      total: parseInt(stats.total),
      mi_valoracion: rating
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/players/:id/rating
 * Elimina la valoración del usuario actual
 */
router.delete('/:id/rating', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'DELETE FROM player_ratings WHERE player_id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    const stats = await queryOne(
      `SELECT
         ROUND(AVG(rating)::numeric, 1) AS promedio,
         COUNT(*) AS total
       FROM player_ratings
       WHERE player_id = $1`,
      [id]
    );

    res.json({
      promedio: stats?.promedio ? parseFloat(stats.promedio) : null,
      total: parseInt(stats?.total || 0),
      mi_valoracion: null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
