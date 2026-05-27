-- Agregar full_name a profiles para mostrar nombres de administradores
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
