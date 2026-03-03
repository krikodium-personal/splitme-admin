-- ============================================
-- ASOCIAR PAGOS A ORDER_BATCHES
-- ============================================
-- Cada pago queda registrado individualmente y asociado a un batch.
-- Así se pueden mostrar por envío y no cobrar de nuevo lo ya pagado.
--
-- Ejecuta en el SQL Editor de Supabase
-- ============================================

-- 1. Agregar columna batch_id a payments (nullable para pagos existentes)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES order_batches(id) ON DELETE SET NULL;

-- 2. Agregar a payments_archive
ALTER TABLE payments_archive
ADD COLUMN IF NOT EXISTS batch_id UUID;

-- 3. Índice para consultas por batch
CREATE INDEX IF NOT EXISTS idx_payments_batch_id ON payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_payments_archive_batch_id ON payments_archive(batch_id);

-- 4. Asegurar columna amount si no existe (para el monto del pago)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE payments_archive ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;

-- 5. Comentario para documentación
COMMENT ON COLUMN payments.batch_id IS 'Batch (envío) al que corresponde este pago. Permite múltiples pagos por comensal (uno por envío) y no cobrar lo ya pagado.';

-- ============================================
-- NOTAS PARA LA APP DE COMENSALES
-- ============================================
-- Al crear un pago (MercadoPago, efectivo, etc.):
--   - Incluir batch_id del batch que se está pagando
--   - Un comensal puede tener varios registros en payments (uno por cada batch que paga)
--
-- Al calcular monto a cobrar:
--   - Total del batch = suma de items del batch
--   - Ya pagado por guest = SUM(amount) FROM payments WHERE guest_id=X AND batch_id=Y
--   - A cobrar = Total del batch - Ya pagado (por ese guest en ese batch)
--
-- order_guests.individual_amount puede usarse como resumen histórico,
-- pero el monto real por cobrar debe calcularse desde payments + batch.
-- ============================================
