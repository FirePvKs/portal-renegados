/**
 * Sistema de permisos.
 *
 * Por ahora todos los permisos requieren ser líder.
 * En el futuro: agregar tabla user_permissions y/o role_permissions
 * y modificar estas funciones sin tocar las rutas.
 */

const PERMISSIONS = {
  MANAGE_PLAYERS: 'manage_players',
  MANAGE_JUTSUS: 'manage_jutsus',
  MANAGE_FACTIONS: 'manage_factions'
};

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function hasPermission(user, permission) {
  if (!user) return false;

  // Líder siempre tiene todos los permisos
  if (user.role === 'lider') return true;

  // En el futuro:
  // - chequear user.permissions (array que vendría de tabla user_permissions)
  // - chequear ROLE_PERMISSIONS[user.role]
  // por ahora nadie más tiene estos permisos
  return false;
}

/**
 * Middleware factory: requireAuth y luego permiso
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        error: 'No tienes permiso para realizar esta acción'
      });
    }
    next();
  };
}

export { PERMISSIONS };
