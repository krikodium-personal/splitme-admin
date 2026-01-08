-- ============================================
-- Migración de Datos Históricos al Dashboard
-- ============================================
-- Objetivo: Migrar órdenes ya cerradas (status = 'Pagado') a las tablas del dashboard
-- 
-- IMPORTANTE: Ejecutar este script solo una vez después de crear las tablas del dashboard
-- Si ya hay órdenes cerradas antes de crear los triggers, este script las migra.
-- ============================================

-- Paso 1: Migrar órdenes cerradas a dashboard_order_events
-- (Solo si no existen ya - evita duplicados)
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
  -- Usar created_at como fecha de cierre (no tenemos updated_at en orders)
  created_at as closed_at,
  NOW()
FROM orders o
WHERE status = 'Pagado'
  AND NOT EXISTS (
    SELECT 1 FROM dashboard_order_events doe 
    WHERE doe.order_id = o.id
  );

-- Paso 2: Migrar a dashboard_daily_summary (agregar por día)
-- Agrupar eventos por fecha y restaurante, insertar/actualizar en tabla agregada
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
WHERE NOT EXISTS (
  SELECT 1 FROM dashboard_daily_summary dds 
  WHERE dds.restaurant_id = dashboard_order_events.restaurant_id 
    AND dds.summary_date = DATE(dashboard_order_events.closed_at)
)
GROUP BY restaurant_id, DATE(closed_at)
ON CONFLICT (restaurant_id, summary_date) 
DO UPDATE SET
  total_orders = dashboard_daily_summary.total_orders + EXCLUDED.total_orders,
  total_sales = dashboard_daily_summary.total_sales + EXCLUDED.total_sales,
  total_guests = dashboard_daily_summary.total_guests + EXCLUDED.total_guests,
  updated_at = NOW();

-- ============================================
-- Verificación: Mostrar resumen de migración
-- ============================================
SELECT 
  'Eventos migrados' as tipo,
  COUNT(*) as cantidad
FROM dashboard_order_events

UNION ALL

SELECT 
  'Resúmenes diarios creados' as tipo,
  COUNT(*) as cantidad
FROM dashboard_daily_summary;

-- Mostrar resumen por restaurante
SELECT 
  restaurant_id,
  COUNT(*) as total_eventos,
  MIN(closed_at) as primera_orden,
  MAX(closed_at) as ultima_orden
FROM dashboard_order_events
GROUP BY restaurant_id
ORDER BY restaurant_id;

