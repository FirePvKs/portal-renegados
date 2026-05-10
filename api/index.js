import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from '../backend/src/routes/auth.js';
import adminRoutes from '../backend/src/routes/admin.js';
import profileRoutes from '../backend/src/routes/profiles.js';
import uploadRoutes from '../backend/src/routes/uploads.js';
import cardsRoutes from '../backend/src/routes/cards.js';
import playersRoutes from '../backend/src/routes/players.js';
import jutsusRoutes from '../backend/src/routes/jutsus.js';
import factionsRoutes from '../backend/src/routes/factions.js';
import mapRoutes from '../backend/src/routes/map.js';
import mobsRoutes from '../backend/src/routes/mobs.js';

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'https://portal-renegados.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origin (Postman, server-to-server)
    if (!origin) return cb(null, true);
    // Permitir cualquier subdominio de vercel.app
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/jutsus', jutsusRoutes);
app.use('/api/factions', factionsRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/mobs', mobsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Error del servidor' });
});

export default app;
