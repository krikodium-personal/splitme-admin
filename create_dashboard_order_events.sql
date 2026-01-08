-- ============================================
-- Dashboard Accumulator: Eventos de Orden Cerrada
-- ============================================
-- Objetivo:
-- 1) Guardar 1 fila por cada orden que se cierra (status -> 'Pagado')
-- 2) Permitir que el Dashboard lea métricas históricas aunque la orden se archive y se borre de `orders`
--
-- IMPORTANTE:
-- - Este script NO modifica el flujo de archivado.
-- - Inserta eventos al momento de cerrar la orden (antes de archivar).
-- ============================================

-- Requiere gen_random_uuid() (extensión pgcrypto). En Supabase suele estar habilitada.

CREATE TABLE IF NOT EXISTS dashboard_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  order_id UUID NOT NULL,
  table_id UUID,
  total_amount NUMERIC,
  guest_count INTEGER,
  order_created_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evitar duplicados (una orden cerrada = un evento)
-- Eliminar constraint si existe antes de crearla
ALTER TABLE dashboard_order_events
  DROP CONSTRAINT IF EXISTS dashboard_order_events_order_id_key;
  
ALTER TABLE dashboard_order_events
  ADD CONSTRAINT dashboard_order_events_order_id_key UNIQUE (order_id);

-- Índices para queries del dashboard
CREATE INDEX IF NOT EXISTS idx_dashboard_order_events_restaurant_closed_at
  ON dashboard_order_events (restaurant_id, closed_at DESC);

CREATE INDEX IF NOT EXISTS idx_dashboard_order_events_restaurant_created_at
  ON dashboard_order_events (restaurant_id, order_created_at DESC);

-- RLS
ALTER TABLE dashboard_order_events ENABLE ROW LEVEL SECURITY;

-- Política de lectura: usuarios autenticados pueden leer solo su restaurant_id (usando tabla profiles)
-- Ajustar el nombre/columna si tu schema difiere.
DROP POLICY IF EXISTS "Allow read dashboard_order_events by restaurant" ON dashboard_order_events;
CREATE POLICY "Allow read dashboard_order_events by restaurant"
  ON dashboard_order_events
  FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- No damos INSERT directo a authenticated: el trigger inserta vía SECURITY DEFINER.

-- ============================================
-- Trigger: insertar evento cuando una orden pasa a Pagado
-- ============================================

CREATE OR REPLACE FUNCTION public.record_dashboard_order_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo cuando cambia a Pagado
  IF NEW.status = 'Pagado' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.dashboard_order_events (
      restaurant_id,
      order_id,
      table_id,
      total_amount,
      guest_count,
      order_created_at,
      closed_at
    )
    VALUES (
      NEW.restaurant_id,
      NEW.id,
      NEW.table_id,
      NEW.total_amount,
      NEW.guest_count,
      NEW.created_at,
      NOW()
    )
    ON CONFLICT (order_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_dashboard_order_event ON public.orders;
CREATE TRIGGER trg_record_dashboard_order_event
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.record_dashboard_order_event();

-- (Opcional) Permitir a authenticated ejecutar la función (no es necesario para trigger)
-- GRANT EXECUTE ON FUNCTION public.record_dashboard_order_event() TO authenticated;


