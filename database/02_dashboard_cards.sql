-- ============================================
-- DASHBOARD CARDS - Sistema de tarjetas dinámicas
-- ============================================

CREATE TABLE dashboard_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  imagen_url TEXT,
  imagen_public_id TEXT,
  link TEXT,                    -- URL externa o ruta interna (ej: /cards/abc)
  is_external BOOLEAN NOT NULL DEFAULT false,
  is_coming_soon BOOLEAN NOT NULL DEFAULT true,
  orden INTEGER NOT NULL DEFAULT 0,
  -- Permisos: si is_public = true, todos pueden verla.
  -- Si is_public = false, solo roles en allowed_roles + usuarios en card_user_access
  is_public BOOLEAN NOT NULL DEFAULT true,
  allowed_roles user_role[] DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dashboard_cards_orden ON dashboard_cards(orden);

-- Tabla de acceso por usuario específico (cuando is_public=false)
CREATE TABLE card_user_access (
  card_id UUID NOT NULL REFERENCES dashboard_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX idx_card_user_access_user ON card_user_access(user_id);

-- Trigger updated_at
CREATE TRIGGER dashboard_cards_updated_at
  BEFORE UPDATE ON dashboard_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Insertar las 6 tarjetas iniciales
-- ============================================
INSERT INTO dashboard_cards (titulo, subtitulo, is_coming_soon, orden, is_public) VALUES
  ('MAPA ZONAS', 'Territorios por sub divisiones', true, 1, true),
  ('LIBRO BINGO', 'Ninjas externos a la facción', false, 2, true),
  ('CALCULADORA DE NIVELES', 'Mobs, prestigios, farm etc', false, 3, true),
  ('PROXIMAMENTE', 'Próximamente', true, 4, true),
  ('PROXIMAMENTE', 'Próximamente', true, 5, true),
  ('PROXIMAMENTE', 'Próximamente', true, 6, true);
