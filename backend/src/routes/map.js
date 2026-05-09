import express from 'express';
import { query, queryOne, queryMany, pool } from '../lib/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requirePermission, PERMISSIONS } from '../lib/permissions.js';

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function canSeeRoute(route, userId) {
  if (route.is_public) return true;
  if (!userId) return false;
  if (route.allowed_roles?.includes('all')) return true;
  const access = await queryOne(
    'SELECT 1 FROM map_route_user_access WHERE route_id=$1 AND user_id=$2',
    [route.id, userId]
  );
  return !!access;
}

async function getRouteWithDetails(routeId) {
  const route = await queryOne('SELECT * FROM map_routes WHERE id=$1', [routeId]);
  if (!route) return null;
  const points = await queryMany(
    'SELECT * FROM map_points WHERE route_id=$1 ORDER BY orden ASC, created_at ASC',
    [routeId]
  );
  const steps = await queryMany(
    'SELECT * FROM map_steps WHERE route_id=$1 ORDER BY orden ASC, created_at ASC',
    [routeId]
  );
  const allowedUsers = await queryMany(
    `SELECT u.id, u.username FROM map_route_user_access a
     JOIN users u ON u.id = a.user_id WHERE a.route_id=$1`,
    [routeId]
  );
  return { ...route, points, steps, allowed_users: allowedUsers };
}

// ─── GET /api/map/routes ─────────────────────────────────────────────────────
router.get('/routes', optionalAuth, async (req, res) => {
  try {
    const routes = await queryMany(
      `SELECT r.*, u.username AS created_by_username
       FROM map_routes r
       LEFT JOIN users u ON u.id = r.created_by
       ORDER BY r.created_at DESC`
    );

    const userId = req.user?.id || null;

    // Filtrar solo las que el usuario puede ver
    const visible = await Promise.all(
      routes.map(async r => {
        const ok = await canSeeRoute(r, userId);
        return ok ? r : null;
      })
    );

    res.json({ routes: visible.filter(Boolean) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/map/routes/all (admin - todas) ─────────────────────────────────
router.get('/routes/all', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  try {
    const routes = await queryMany(
      `SELECT r.*, u.username AS created_by_username
       FROM map_routes r
       LEFT JOIN users u ON u.id = r.created_by
       ORDER BY r.created_at DESC`
    );
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/map/routes/:id ─────────────────────────────────────────────────
router.get('/routes/:id', optionalAuth, async (req, res) => {
  try {
    const route = await getRouteWithDetails(req.params.id);
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });

    const ok = await canSeeRoute(route, req.user?.id || null);
    if (!ok) return res.status(403).json({ error: 'Sin acceso a esta ruta' });

    res.json({ route });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/map/routes ────────────────────────────────────────────────────
router.post('/routes', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { nombre, color, descripcion, linea, is_public, allowed_roles, allowed_users, points, steps } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

    const result = await client.query(
      `INSERT INTO map_routes (nombre, color, descripcion, linea, is_public, allowed_roles, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nombre.trim(), color || '#e0e2c9', descripcion || null,
       JSON.stringify(linea || []), is_public ?? true,
       allowed_roles?.length ? allowed_roles : null, req.user.id]
    );
    const route = result.rows[0];

    // Insertar puntos
    if (points?.length) {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        await client.query(
          `INSERT INTO map_points (route_id,nombre,color,pos_x,pos_y,coord_x,coord_y,coord_z,imagen_url,imagen_public_id,orden)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [route.id, p.nombre, p.color || color || '#e0e2c9',
           p.pos_x, p.pos_y, p.coord_x || null, p.coord_y || null, p.coord_z || null,
           p.imagen_url || null, p.imagen_public_id || null, i]
        );
      }
    }

    // Insertar pasos
    if (steps?.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await client.query(
          `INSERT INTO map_steps (route_id, orden, texto, imagen_url, imagen_public_id)
           VALUES ($1,$2,$3,$4,$5)`,
          [route.id, i, s.texto, s.imagen_url || null, s.imagen_public_id || null]
        );
      }
    }

    // Insertar accesos por usuario
    if (!is_public && allowed_users?.length) {
      for (const uid of allowed_users) {
        await client.query(
          'INSERT INTO map_route_user_access (route_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [route.id, uid]
        );
      }
    }

    await client.query('COMMIT');
    const full = await getRouteWithDetails(route.id);
    res.status(201).json({ route: full });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── PATCH /api/map/routes/:id ───────────────────────────────────────────────
router.patch('/routes/:id', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { nombre, color, descripcion, linea, is_public, allowed_roles, allowed_users, points, steps } = req.body;

    const existing = await queryOne('SELECT id FROM map_routes WHERE id=$1', [id]);
    if (!existing) return res.status(404).json({ error: 'Ruta no encontrada' });

    await client.query(
      `UPDATE map_routes SET
         nombre=$1, color=$2, descripcion=$3, linea=$4,
         is_public=$5, allowed_roles=$6, updated_at=NOW()
       WHERE id=$7`,
      [nombre.trim(), color, descripcion || null,
       JSON.stringify(linea || []), is_public ?? true,
       allowed_roles?.length ? allowed_roles : null, id]
    );

    // Reemplazar puntos
    await client.query('DELETE FROM map_points WHERE route_id=$1', [id]);
    if (points?.length) {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        await client.query(
          `INSERT INTO map_points (route_id,nombre,color,pos_x,pos_y,coord_x,coord_y,coord_z,imagen_url,imagen_public_id,orden)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [id, p.nombre, p.color || color || '#e0e2c9',
           p.pos_x, p.pos_y, p.coord_x || null, p.coord_y || null, p.coord_z || null,
           p.imagen_url || null, p.imagen_public_id || null, i]
        );
      }
    }

    // Reemplazar pasos
    await client.query('DELETE FROM map_steps WHERE route_id=$1', [id]);
    if (steps?.length) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await client.query(
          `INSERT INTO map_steps (route_id, orden, texto, imagen_url, imagen_public_id)
           VALUES ($1,$2,$3,$4,$5)`,
          [id, i, s.texto, s.imagen_url || null, s.imagen_public_id || null]
        );
      }
    }

    // Reemplazar accesos
    await client.query('DELETE FROM map_route_user_access WHERE route_id=$1', [id]);
    if (!is_public && allowed_users?.length) {
      for (const uid of allowed_users) {
        await client.query(
          'INSERT INTO map_route_user_access (route_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [id, uid]
        );
      }
    }

    await client.query('COMMIT');
    const full = await getRouteWithDetails(id);
    res.json({ route: full });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── DELETE /api/map/routes/:id ──────────────────────────────────────────────
router.delete('/routes/:id', requireAuth, requirePermission(PERMISSIONS.MANAGE_PLAYERS), async (req, res) => {
  try {
    await query('DELETE FROM map_routes WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
