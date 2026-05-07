import express from 'express';
import cloudinary from '../lib/cloudinary.js';
import { requireAuth } from '../middleware/auth.js';
import { hasPermission, PERMISSIONS } from '../lib/permissions.js';

const router = express.Router();

// Mapeo de kind → carpeta y permiso requerido
const KIND_CONFIG = {
  // Personales (cualquier autenticado, cada uno a su carpeta)
  avatar:  { folder: (u) => `renegados/users/${u.id}/avatars`,  permission: null },
  banner:  { folder: (u) => `renegados/users/${u.id}/banners`,  permission: null },
  item:    { folder: (u) => `renegados/users/${u.id}/items`,    permission: null },

  // Admin (requieren permisos)
  card:    { folder: () => `renegados/cards`,    permission: PERMISSIONS.MANAGE_PLAYERS },
  player:  { folder: () => `renegados/players`,  permission: PERMISSIONS.MANAGE_PLAYERS },
  jutsu:   { folder: () => `renegados/jutsus`,   permission: PERMISSIONS.MANAGE_JUTSUS },
  faction: { folder: () => `renegados/factions`, permission: PERMISSIONS.MANAGE_FACTIONS }
};

router.post('/signature', requireAuth, async (req, res) => {
  try {
    const { kind } = req.body;

    const cfg = KIND_CONFIG[kind];
    if (!cfg) {
      return res.status(400).json({ error: 'kind inválido' });
    }

    if (cfg.permission && !hasPermission(req.user, cfg.permission)) {
      return res.status(403).json({ error: 'Sin permiso para subir esta imagen' });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = cfg.folder(req.user);

    const paramsToSign = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });
  } catch (err) {
    console.error('Signature error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:publicId(*)', requireAuth, async (req, res) => {
  try {
    const publicId = req.params.publicId;

    // Las imágenes propias del usuario se pueden borrar siempre
    const userPrefix = `renegados/users/${req.user.id}/`;
    if (publicId.startsWith(userPrefix)) {
      const result = await cloudinary.uploader.destroy(publicId);
      return res.json({ ok: true, result });
    }

    // Imágenes de admin requieren permisos
    const isAdminImage =
      publicId.startsWith('renegados/cards/') ||
      publicId.startsWith('renegados/players/') ||
      publicId.startsWith('renegados/jutsus/') ||
      publicId.startsWith('renegados/factions/');

    if (isAdminImage && hasPermission(req.user, PERMISSIONS.MANAGE_PLAYERS)) {
      const result = await cloudinary.uploader.destroy(publicId);
      return res.json({ ok: true, result });
    }

    return res.status(403).json({ error: 'Sin permiso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
