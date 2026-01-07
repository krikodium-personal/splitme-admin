-- Script para renombrar columnas en payment_configs
-- Hace los nombres más genéricos para soportar múltiples medios de pago
--
-- Cambios:
-- - mp_user_id → user_account
-- - access_token → token_cbu
-- - public_key → key_alias
--
-- Ejecuta este script en el SQL Editor de Supabase

-- Paso 1: Verificar la estructura actual de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_configs'
    AND column_name IN ('mp_user_id', 'access_token', 'public_key', 'user_account', 'token_cbu', 'key_alias')
ORDER BY column_name;

-- Paso 2: Renombrar las columnas
-- Nota: Si alguna columna ya tiene el nuevo nombre, el comando fallará con un error claro

-- Renombrar mp_user_id a user_account
ALTER TABLE payment_configs 
RENAME COLUMN mp_user_id TO user_account;

-- Renombrar access_token a token_cbu
ALTER TABLE payment_configs 
RENAME COLUMN access_token TO token_cbu;

-- Renombrar public_key a key_alias
ALTER TABLE payment_configs 
RENAME COLUMN public_key TO key_alias;

-- Paso 3: Verificar que los cambios se aplicaron correctamente
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_configs'
    AND column_name IN ('user_account', 'token_cbu', 'key_alias')
ORDER BY column_name;

-- Paso 4: Verificar que los datos se mantuvieron intactos
SELECT 
    id,
    restaurant_id,
    provider,
    user_account,
    token_cbu,
    key_alias,
    is_active,
    created_at
FROM payment_configs
LIMIT 10;

