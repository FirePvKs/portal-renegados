import { queryOne } from '../lib/db.js';
import { verifyToken, hashToken, COOKIE_NAME } from '../lib/auth.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const payload = verifyToken(token);
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    const tokenHash = hashToken(token);
    const session = await queryOne(
      'SELECT user_id, expires_at FROM sessions WHERE token_hash = $1',
      [tokenHash]
    );

    if (!session || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada' });
    }

    const user = await queryOne(
      `SELECT id, username, role, avatar_url, avatar_public_id,
              banner_url, banner_public_id, nivel, prestigio, bio,
              last_login_at, created_at
       FROM users WHERE id = $1`,
      [payload.sub]
    );

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Error verificando sesión' });
  }
}

export function requireLider(req, res, next) {
  if (req.user?.role !== 'lider') {
    return res.status(403).json({ error: 'Solo el líder puede realizar esta acción' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!['lider', 'sub_lider'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Acceso de admin requerido' });
  }
  next();
}
