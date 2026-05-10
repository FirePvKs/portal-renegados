-- ============================================
-- SISTEMA DE RUTAS DE MAPA
-- ============================================

-- Tabla principal de rutas
CREATE TABLE map_routes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  color         TEXT NOT NULL DEFAULT '#e0e2c9',
  descripcion   TEXT,
  -- Línea libre: array de puntos {x, y} en porcentaje (0-100) sobre la imagen
  linea         JSONB DEFAULT '[]',
  -- Permisos: si is_public = true todos los miembros la ven
  is_public     BOOLEAN NOT NULL DEFAULT true,
  allowed_roles TEXT[] DEFAULT NULL,
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Acceso por usuario específico a rutas privadas
CREATE TABLE map_route_user_access (
  route_id  UUID NOT NULL REFERENCES map_routes(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (route_id, user_id)
);

-- Puntos de interés sobre el mapa (pertenecen a una ruta)
CREATE TABLE map_points (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES map_routes(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#e0e2c9',
  -- Posición en porcentaje sobre la imagen del mapa
  pos_x       NUMERIC(6,3) NOT NULL,
  pos_y       NUMERIC(6,3) NOT NULL,
  -- Coordenadas del juego (visibles en tooltip)
  coord_x     INTEGER,
  coord_y     INTEGER,
  coord_z     INTEGER,
  imagen_url  TEXT,
  imagen_public_id TEXT,
  orden       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pasos de la ruta
CREATE TABLE map_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES map_routes(id) ON DELETE CASCADE,
  orden       INTEGER NOT NULL DEFAULT 0,
  texto       TEXT NOT NULL,
  imagen_url  TEXT,
  imagen_public_id TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_map_routes_created_by ON map_routes(created_by);
CREATE INDEX idx_map_points_route ON map_points(route_id);
CREATE INDEX idx_map_steps_route ON map_steps(route_id);
CREATE INDEX idx_map_route_user_access ON map_route_user_access(user_id);

CREATE TRIGGER map_routes_updated_at
  BEFORE UPDATE ON map_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
