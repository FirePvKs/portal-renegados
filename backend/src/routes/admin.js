import express from 'express';
import { query, queryOne, queryMany } from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth, requireLider } from '../middleware/auth.js';
import {
  isSuperAdmin, canManageUser, resolvePermissions,
  hasPermissionAsync, PERMISSIONS, SUPER_ADMIN
} from '../lib/permissions.js';

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

// ─── Cambio de rango con verificación de permisos ────────────────────────────
router.patch('/users/:id/role', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const target = await queryOne('SELECT id, username, role FROM users WHERE id=$1', [id]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Protección super admin
    if (isSuperAdmin(target) && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'No podés modificar al super administrador' });
    }

    // Verificar permiso de ascender/descender
    const canChange = await hasPermissionAsync(req.user, PERMISSIONS.ASCENDER_RANGO);
    if (!canChange && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'No tenés permiso para cambiar rangos' });
    }

    if (req.user.id === id && role !== 'lider') {
      const result = await queryOne(`SELECT COUNT(*)::int AS count FROM users WHERE role='lider'`);
      if (result.count === 1) {
        return res.status(400).json({ error: 'No podés quitarte el rol, sos el único líder' });
      }
    }

    const user = await queryOne(
      `UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, role`,
      [role, id]
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET permisos de un usuario ───────────────────────────────────────────────
router.get('/users/:id/permissions', requireAuth, async (req, res) => {
  try {
    const target = await queryOne('SELECT id, username, role FROM users WHERE id=$1', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    const perms = await resolvePermissions(target);
    const overrides = await queryMany(
      'SELECT permission, granted FROM user_permissions WHERE user_id=$1',
      [target.id]
    );
    const rolePerms = await queryMany(
      'SELECT permission, granted FROM role_permissions WHERE role=$1',
      [target.role]
    );
    const allDefs = await queryMany('SELECT key, label, descripcion FROM permission_definitions ORDER BY key');

    res.json({ perms, overrides, rolePerms, allDefs, isSuperAdmin: isSuperAdmin(target) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET permisos por rango ───────────────────────────────────────────────────
router.get('/role-permissions', requireAuth, async (req, res) => {
  try {
    const rolePerms = await queryMany('SELECT role, permission, granted FROM role_permissions ORDER BY role, permission');
    const allDefs = await queryMany('SELECT key, label, descripcion FROM permission_definitions ORDER BY key');
    res.json({ rolePerms, allDefs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH permisos por rango ─────────────────────────────────────────────────
router.patch('/role-permissions', requireAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'Solo el super administrador puede modificar permisos de rangos' });
    }
    const { role, permission, granted } = req.body;
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' });

    await query(
      `INSERT INTO role_permissions (role, permission, granted)
       VALUES ($1,$2,$3)
       ON CONFLICT (role, permission) DO UPDATE SET granted=$3`,
      [role, permission, granted]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH permisos individuales de un usuario ───────────────────────────────
router.patch('/users/:id/permissions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body; // [{ permission, granted }]

    const target = await queryOne('SELECT id, username, role FROM users WHERE id=$1', [id]);
    if (!target) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!canManageUser(req.user, target)) {
      return res.status(403).json({ error: 'No podés modificar los permisos de este usuario' });
    }

    const actorCanGivePerms = await hasPermissionAsync(req.user, PERMISSIONS.DAR_PERMISOS);
    if (!actorCanGivePerms && !isSuperAdmin(req.user)) {
      return res.status(403).json({ error: 'No tenés permiso para dar permisos' });
    }

    // El actor solo puede dar/quitar permisos que él mismo tiene
    const actorPerms = await resolvePermissions(req.user);

    for (const { permission, granted } of permissions) {
      // Si no es super admin, solo puede dar permisos que él tiene
      if (!isSuperAdmin(req.user) && granted && !actorPerms[permission]) {
        return res.status(403).json({
          error: `No podés dar el permiso "${permission}" porque vos no lo tenés`
        });
      }

      if (granted === null || granted === undefined) {
        // Eliminar override — vuelve al default del rango
        await query(
          'DELETE FROM user_permissions WHERE user_id=$1 AND permission=$2',
          [id, permission]
        );
      } else {
        await query(
          `INSERT INTO user_permissions (user_id, permission, granted, granted_by)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, permission) DO UPDATE SET granted=$3, granted_by=$4`,
          [id, permission, granted, req.user.id]
        );
      }
    }

    // Devolver permisos actualizados
    const perms = await resolvePermissions(target);
    const overrides = await queryMany(
      'SELECT permission, granted FROM user_permissions WHERE user_id=$1',
      [id]
    );
    res.json({ perms, overrides });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
