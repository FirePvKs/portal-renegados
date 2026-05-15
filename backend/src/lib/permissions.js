import { queryOne, queryMany } from './db.js';

// ─── Constantes ───────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  VER_TARJETAS:       'ver_tarjetas',
  VER_RUTAS:          'ver_rutas',
  ASCENDER_RANGO:     'ascender_rango',
  REGISTRAR_MIEMBRO:  'registrar_miembro',
  REGISTRAR_JUGADOR:  'registrar_jugador',
  REGISTRAR_RUTA:     'registrar_ruta',
  ELIMINAR_CONTENIDO: 'eliminar_contenido',
  EDITAR_CONTENIDO:   'editar_contenido',
  DAR_PERMISOS:       'dar_permisos',
  // Aliases para compatibilidad con código existente
  MANAGE_PLAYERS:  'registrar_jugador',
  MANAGE_JUTSUS:   'editar_contenido',
  MANAGE_FACTIONS: 'editar_contenido',
};

export const SUPER_ADMIN = 'firepentakiller';

export function isSuperAdmin(user) {
  return user?.username?.toLowerCase() === SUPER_ADMIN.toLowerCase();
}

export async function resolvePermissions(user) {
  if (!user) return {};
  if (isSuperAdmin(user)) {
    const defs = await queryMany('SELECT key FROM permission_definitions');
    return Object.fromEntries(defs.map(d => [d.key, true]));
  }

  const rolePerms = await queryMany(
    'SELECT permission, granted FROM role_permissions WHERE role = $1',
    [user.role]
  );
  const perms = Object.fromEntries(rolePerms.map(p => [p.permission, p.granted]));

  const userPerms = await queryMany(
    'SELECT permission, granted FROM user_permissions WHERE user_id = $1',
    [user.id]
  );
  for (const p of userPerms) {
    perms[p.permission] = p.granted;
  }

  return perms;
}

export async function hasPermissionAsync(user, permission) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const perms = await resolvePermissions(user);
  return perms[permission] === true;
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (user.perms) return user.perms[permission] === true;
  if (user.role === 'lider') return true;
  return false;
}

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const ok = await hasPermissionAsync(req.user, permission);
      if (!ok) {
        return res.status(403).json({ error: 'No tenés permiso para realizar esta acción' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

export function canManageUser(actor, target) {
  if (!actor || !target) return false;
  if (isSuperAdmin(target) && !isSuperAdmin(actor)) return false;
  if (isSuperAdmin(actor)) return true;
  if (actor.id === target.id) return false;
  return true;
}
