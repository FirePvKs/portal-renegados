import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function queryOne(text, params) {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

export async function queryMany(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}
