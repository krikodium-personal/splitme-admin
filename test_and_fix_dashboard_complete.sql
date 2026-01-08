-- ============================================
-- Script Completo: Testear y Corregir Dashboard
-- ============================================
-- Este script:
-- 1. Verifica el estado actual
-- 2. Corrige los triggers
-- 3. Migra órdenes cerradas existentes
-- 4. Prueba el trigger manualmente
-- ============================================

-- ============================================
-- PASO 1: Verificar estado actual
-- ============================================
SELECT '=== VERIFICACIÓN INICIAL ===' as paso;

-- Verificar órdenes cerradas
SELECT 
  'Órdenes con status Pagado' as check_type,
  COUNT(*) as count
FROM orders
WHERE status = 'Pagado';

-- Verificar eventos
SELECT 
  'Eventos en dashboard_order_events' as check_type,
  COUNT(*) as count
FROM dashboard_order_events;

-- Verificar resúmenes
SELECT 
  'Resúmenes en dashboard_daily_summary' as check_type,
  COUNT(*) as count
FROM dashboard_daily_summary;

-- ============================================
-- PASO 2: Corregir función del trigger
-- ============================================
SELECT '=== CORRIGIENDO FUNCIÓN DEL TRIGGER ===' as paso;

CREATE OR REPLACE FUNCTION public.record_dashboard_order_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary_date_val DATE;
BEGIN
  -- Solo cuando cambia a Pagado
  IF NEW.status = 'Pagado' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Insertar evento
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
    
    -- Actualizar resumen diario
    summary_date_val := DATE(NOW());
    
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
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- PASO 3: Eliminar y recrear triggers
-- ============================================
SELECT '=== RECREANDO TRIGGERS ===' as paso;

DROP TRIGGER IF EXISTS trg_record_dashboard_order_event ON public.orders;
DROP TRIGGER IF EXISTS trigger_record_dashboard_order_event ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_dashboard_daily_summary ON public.dashboard_order_events;

-- Crear trigger principal
CREATE TRIGGER trg_record_dashboard_order_event
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'Pagado' AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.record_dashboard_order_event();

-- ============================================
-- PASO 4: Migrar órdenes cerradas existentes
-- ============================================
SELECT '=== MIGRANDO ÓRDENES CERRADAS EXISTENTES ===' as paso;

-- Migrar a dashboard_order_events
INSERT INTO dashboard_order_events (
  restaurant_id,
  order_id,
  table_id,
  total_amount,
  guest_count,
  order_created_at,
  closed_at,
  created_at
)
SELECT 
  restaurant_id,
  id,
  table_id,
  total_amount,
  guest_count,
  created_at,
  created_at as closed_at,
  NOW()
FROM orders o
WHERE status = 'Pagado'
  AND NOT EXISTS (
    SELECT 1 FROM dashboard_order_events doe 
    WHERE doe.order_id = o.id
  );

-- Migrar a dashboard_daily_summary
INSERT INTO dashboard_daily_summary (
  restaurant_id,
  summary_date,
  total_orders,
  total_sales,
  total_guests
)
SELECT 
  restaurant_id,
  DATE(closed_at) as summary_date,
  COUNT(*)::INTEGER as total_orders,
  SUM(total_amount) as total_sales,
  SUM(guest_count)::INTEGER as total_guests
FROM dashboard_order_events
GROUP BY restaurant_id, DATE(closed_at)
ON CONFLICT (restaurant_id, summary_date) 
DO UPDATE SET
  total_orders = dashboard_daily_summary.total_orders + EXCLUDED.total_orders,
  total_sales = dashboard_daily_summary.total_sales + EXCLUDED.total_sales,
  total_guests = dashboard_daily_summary.total_guests + EXCLUDED.total_guests,
  updated_at = NOW();

-- ============================================
-- PASO 5: Verificar resultados
-- ============================================
SELECT '=== VERIFICACIÓN FINAL ===' as paso;

-- Verificar órdenes cerradas
SELECT 
  'Órdenes con status Pagado' as tipo,
  COUNT(*) as cantidad,
  MIN(created_at) as primera,
  MAX(created_at) as ultima
FROM orders
WHERE status = 'Pagado';

-- Verificar eventos creados
SELECT 
  'Eventos en dashboard_order_events' as tipo,
  COUNT(*) as cantidad,
  MIN(closed_at) as primer_evento,
  MAX(closed_at) as ultimo_evento
FROM dashboard_order_events;

-- Verificar resúmenes creados
SELECT 
  'Resúmenes en dashboard_daily_summary' as tipo,
  COUNT(*) as cantidad,
  MIN(summary_date) as primera_fecha,
  MAX(summary_date) as ultima_fecha,
  SUM(total_orders) as total_ordenes,
  SUM(total_sales) as total_ventas
FROM dashboard_daily_summary;

-- Verificar trigger
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger
WHERE tgname = 'trg_record_dashboard_order_event'
  AND tgrelid = 'orders'::regclass;

-- ============================================
-- PASO 6: Mostrar resumen por restaurante
-- ============================================
SELECT '=== RESUMEN POR RESTAURANTE ===' as paso;

SELECT 
  restaurant_id,
  COUNT(*) as total_eventos,
  SUM(total_amount) as total_ventas,
  SUM(guest_count) as total_comensales,
  MIN(closed_at) as primera_orden,
  MAX(closed_at) as ultima_orden
FROM dashboard_order_events
GROUP BY restaurant_id
ORDER BY restaurant_id;

