-- ============================================
-- MIGRACIÓN: Sistema de Jugadores + Jutsus + Facciones
-- Pegar TODO en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Reformatear tabla JUTSUS actual a CATÁLOGO GLOBAL
-- ============================================

-- Borrar la tabla vieja (estaba vacía)
DROP TABLE IF EXISTS jutsus CASCADE;

-- Crear catálogo global de jutsus
CREATE TABLE jutsus_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  rango TEXT,  -- E, D, C, B, A, S, SS
  tipo TEXT,   -- ninjutsu, taijutsu, genjutsu, kenjutsu, etc.
  imagen_url TEXT,
  imagen_public_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jutsus_catalog_nombre ON jutsus_catalog(nombre);
CREATE INDEX idx_jutsus_catalog_rango ON jutsus_catalog(rango);

CREATE TRIGGER jutsus_catalog_updated_at
  BEFORE UPDATE ON jutsus_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. FACCIONES
-- ============================================

CREATE TABLE factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  imagen_public_id TEXT,
  color TEXT,  -- hex color para UI ej: "#a02828"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_factions_nombre ON factions(nombre);

CREATE TRIGGER factions_updated_at
  BEFORE UPDATE ON factions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 3. JUGADORES (libro bingo)
-- ============================================

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  imagen_url TEXT,
  imagen_public_id TEXT,
  ultimo_nivel INTEGER,
  ultimo_prestigio INTEGER,
  faction_id UUID REFERENCES factions(id) ON DELETE SET NULL,
  notas TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_nombre ON players(nombre);
CREATE INDEX idx_players_faction ON players(faction_id);

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 4. RELACIÓN N:M - jugador ↔ jutsus
-- ============================================

CREATE TABLE player_jutsus (
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  jutsu_id UUID NOT NULL REFERENCES jutsus_catalog(id) ON DELETE CASCADE,
  notas TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, jutsu_id)
);

CREATE INDEX idx_player_jutsus_player ON player_jutsus(player_id);
CREATE INDEX idx_player_jutsus_jutsu ON player_jutsus(jutsu_id);

-- ============================================
-- 5. Vincular tarjeta "Libro Bingo" a /libro-bingo
-- ============================================

UPDATE dashboard_cards
SET link = '/libro-bingo',
    is_external = false,
    is_coming_soon = false
WHERE titulo = 'LIBRO BINGO';
