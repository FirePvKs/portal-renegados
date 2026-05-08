import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profiles.js';
import uploadRoutes from './routes/uploads.js';
import cardsRoutes from './routes/cards.js';
import factionsRoutes from './routes/factions.js';
import playersRoutes from './routes/players.js';
import jutsusRoutes from './routes/jutsus.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

app.listen(PORT, () => {
  console.log(`🥷 Backend en http://localhost:${PORT}`);
});
