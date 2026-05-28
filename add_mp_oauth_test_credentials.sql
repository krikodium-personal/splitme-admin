-- Credenciales OAuth Mercado Pago: producción (APP_USR) y sandbox (TEST-)
-- Ejecutar en SQL Editor de Supabase

ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS oauth_test_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS token_cbu_test TEXT,
  ADD COLUMN IF NOT EXISTS key_alias_test TEXT;

COMMENT ON COLUMN payment_configs.oauth_test_mode IS 'Modo activo elegido al conectar OAuth: true = sandbox (TEST-), false = producción (APP_USR)';
COMMENT ON COLUMN payment_configs.token_cbu_test IS 'Access token OAuth sandbox (TEST-) del vendedor; solo uso server-side';
COMMENT ON COLUMN payment_configs.key_alias_test IS 'Public key sandbox (TEST-) del vendedor conectado vía OAuth';
