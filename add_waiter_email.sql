-- Agregar columna email a waiters para credenciales de la app splitme-waiter
-- Ejecutar en Supabase SQL Editor

ALTER TABLE waiters
ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN waiters.email IS 'Email para login en la app splitme-waiter';
