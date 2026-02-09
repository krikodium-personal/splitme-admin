-- Columnas necesarias para credenciales de login en app splitme-waiter
-- Ejecutar en Supabase SQL Editor ANTES de usar email/contraseña en el formulario de meseros

-- 1. Columna email
ALTER TABLE waiters ADD COLUMN IF NOT EXISTS email TEXT;
COMMENT ON COLUMN waiters.email IS 'Email para login en la app splitme-waiter';

-- 2. Columna user_id (vincula con auth.users)
ALTER TABLE waiters ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_waiters_user_id ON waiters(user_id);
