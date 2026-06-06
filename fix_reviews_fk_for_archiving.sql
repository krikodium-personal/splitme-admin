-- ============================================
-- Permitir archivar ordenes sin borrar reviews
-- ============================================
-- Los reviews son historicos acumulados para meseros/platos/restaurante.
-- No se archivan ni se eliminan junto con orders.
--
-- La FK reviews_order_id_fkey impide borrar una orden activa al archivarla.
-- Al removerla, reviews.order_id queda como referencia historica UUID simple.

ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;

CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);

NOTIFY pgrst, 'reload schema';
