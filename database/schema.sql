-- ============================================
-- SHINOBI APP - SCHEMA COMPLETO
-- Pegar todo en Supabase SQL Editor
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM de roles
CREATE TYPE user_role AS ENUM (
  'lider',
  'sub_lider',
  'comandante',
  'ayudante',
  'miembro'
);

-- Tabla USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'miembro',
  avatar_url TEXT,
  avatar_public_id TEXT,
  banner_url TEXT,
  banner_public_id TEXT,
  nivel INTEGER NOT NULL DEFAULT 1,
  prestigio INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Tabla SESSIONS
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Tabla JUTSUS
CREATE TABLE jutsus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  rango TEXT,
  tipo TEXT,
  imagen_url TEXT,
  imagen_public_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jutsus_user_id ON jutsus(user_id);

-- Tabla ITEMS_VENTA
CREATE TABLE items_venta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
  imagen_url TEXT,
  imagen_public_id TEXT,
  disponible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_items_venta_user_id ON items_venta(user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- DASHBOARD CARDS
-- ============================================

CREATE TABLE dashboard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  imagen_url TEXT,
  imagen_public_id TEXT,
  link TEXT,
  is_external BOOLEAN NOT NULL DEFAULT false,
  is_coming_soon BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  allowed_roles user_role[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_cards_orden ON dashboard_cards(orden);

CREATE TABLE card_user_access (
  card_id UUID NOT NULL REFERENCES dashboard_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX idx_card_user_access_user ON card_user_access(user_id);

CREATE TRIGGER dashboard_cards_updated_at
  BEFORE UPDATE ON dashboard_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6 tarjetas iniciales
INSERT INTO dashboard_cards (titulo, subtitulo, is_coming_soon, orden, is_public) VALUES
  ('MAPA ZONAS', 'Territorios por sub divisiones', true, 1, true),
  ('LIBRO BINGO', 'Ninjas externos a la facción', false, 2, true),
  ('CALCULADORA DE NIVELES', 'Mobs, prestigios, farm etc', false, 3, true),
  ('PROXIMAMENTE', 'Próximamente', true, 4, true),
  ('PROXIMAMENTE', 'Próximamente', true, 5, true),
  ('PROXIMAMENTE', 'Próximamente', true, 6, true);
