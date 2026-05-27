-- OAuth Mercado Pago por restaurante (SplitMe conecta cuenta vendedora)
-- Ejecutar en SQL Editor de Supabase

ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN payment_configs.refresh_token IS 'Refresh token OAuth MP del vendedor; solo uso server-side';
COMMENT ON COLUMN payment_configs.oauth_connected_at IS 'Fecha en que el restaurante autorizó SplitMe vía OAuth';
COMMENT ON COLUMN payment_configs.token_expires_at IS 'Expiración estimada del access_token OAuth';
