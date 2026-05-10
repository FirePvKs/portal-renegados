-- Columna de valoración admin en players (1-10, null = sin valorar)
ALTER TABLE players ADD COLUMN IF NOT EXISTS valoracion SMALLINT CHECK (valoracion >= 1 AND valoracion <= 10);
