-- Columna legacy (no usada desde admin por restaurante).
-- El webhook de Mercado Pago es único para la app SplitMe; el secret va en
-- MERCADOPAGO_WEBHOOK_SECRET en la Edge Function mercadopago-webhook.
ALTER TABLE payment_configs
ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT NULL;

COMMENT ON COLUMN payment_configs.webhook_secret IS
  'Legacy/no usado. Webhook MP es configuración de plataforma (env MERCADOPAGO_WEBHOOK_SECRET).';
