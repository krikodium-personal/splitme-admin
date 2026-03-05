-- Añadir columna description a la tabla categories (si no existe)
-- Ejecutar en Supabase SQL Editor

ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
