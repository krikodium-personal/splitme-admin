-- ============================================
-- Dashboard: Tabla de Resúmenes Agregados (Diarios)
-- ============================================
-- Objetivo: Acelerar consultas del dashboard pre-agregando datos por día
-- 
-- Estrategia Híbrida:
-- 1. dashboard_order_events: Eventos individuales (flexibilidad + auditoría)
-- 2. dashboard_daily_summary: Resúmenes diarios (performance)
--
-- El trigger actualiza AMBAS tablas cuando se cierra una orden
-- ============================================

-- Tabla de resúmenes diarios (1 fila por restaurante por día)
CREATE TABLE IF NOT EXISTS dashboard_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  summary_date DATE NOT NULL, -- Fecha del resumen (sin hora)
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_guests INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un solo resumen por restaurante por día
  CONSTRAINT dashboard_daily_summary_unique_date UNIQUE (restaurant_id, summary_date)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_dashboard_daily_summary_restaurant_date 
  ON dashboard_daily_summary (restaurant_id, summary_date DESC);

-- RLS
ALTER TABLE dashboard_daily_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read dashboard_daily_summary by restaurant" ON dashboard_daily_summary;
CREATE POLICY "Allow read dashboard_daily_summary by restaurant"
  ON dashboard_daily_summary
  FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- ============================================
-- Función para actualizar/insertar resumen diario
-- ============================================
CREATE OR REPLACE FUNCTION public.update_dashboard_daily_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary_date_val DATE;
BEGIN
  -- Extraer solo la fecha (sin hora) de closed_at
  summary_date_val := DATE(NEW.closed_at);
  
  -- Insertar o actualizar el resumen del día
  INSERT INTO public.dashboard_daily_summary (
    restaurant_id,
    summary_date,
    total_orders,
    total_sales,
    total_guests
  )
  VALUES (
    NEW.restaurant_id,
    summary_date_val,
    1,
    COALESCE(NEW.total_amount, 0),
    COALESCE(NEW.guest_count, 0)
  )
  ON CONFLICT (restaurant_id, summary_date) 
  DO UPDATE SET
    total_orders = dashboard_daily_summary.total_orders + 1,
    total_sales = dashboard_daily_summary.total_sales + COALESCE(NEW.total_amount, 0),
    total_guests = dashboard_daily_summary.total_guests + COALESCE(NEW.guest_count, 0),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- ============================================
-- Modificar trigger existente para que también actualice la tabla de resúmenes
-- ============================================
-- Primero, necesitamos modificar el trigger de dashboard_order_events
-- para que también llame a update_dashboard_daily_summary

-- Verificar si el trigger existe y actualizar
DROP TRIGGER IF EXISTS trigger_record_dashboard_order_event ON orders;
DROP TRIGGER IF EXISTS trigger_update_dashboard_daily_summary ON dashboard_order_events;

-- Trigger que actualiza AMBAS tablas cuando se cierra una orden
CREATE TRIGGER trigger_record_dashboard_order_event
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'Pagado' AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.record_dashboard_order_event();

-- Trigger que actualiza el resumen diario cuando se inserta un evento
CREATE TRIGGER trigger_update_dashboard_daily_summary
  AFTER INSERT ON dashboard_order_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dashboard_daily_summary();

-- ============================================
-- Función RPC para consultar resúmenes del dashboard (usa tabla agregada)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  restaurant_id_param UUID,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_orders BIGINT,
  total_sales NUMERIC,
  total_guests BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(dds.total_orders), 0)::BIGINT as total_orders,
    COALESCE(SUM(dds.total_sales), 0) as total_sales,
    COALESCE(SUM(dds.total_guests), 0)::BIGINT as total_guests
  FROM dashboard_daily_summary dds
  WHERE dds.restaurant_id = restaurant_id_param
    AND (start_date IS NULL OR dds.summary_date >= DATE(start_date))
    AND (end_date IS NULL OR dds.summary_date <= DATE(end_date));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. dashboard_order_events: Mantiene historial detallado (auditoría + consultas específicas)
-- 2. dashboard_daily_summary: Acelera consultas comunes (performance)
-- 3. Ambas se actualizan automáticamente cuando se cierra una orden
-- 4. Para consultas rápidas del dashboard, usar get_dashboard_stats() o consultar dashboard_daily_summary
-- 5. Para consultas detalladas o personalizadas, usar dashboard_order_events
-- ============================================

