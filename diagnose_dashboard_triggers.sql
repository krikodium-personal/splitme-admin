-- ============================================
-- Diagnóstico: Dashboard Triggers
-- ============================================
-- Este script verifica:
-- 1. Si hay órdenes cerradas (status = 'Pagado')
-- 2. Si el trigger está activo
-- 3. Si los eventos se están creando correctamente
-- ============================================

-- 1. Verificar órdenes cerradas
SELECT 
  'Órdenes con status Pagado' as check_type,
  COUNT(*) as count,
  MIN(created_at) as primera_orden,
  MAX(created_at) as ultima_orden
FROM orders
WHERE status = 'Pagado';

-- 2. Verificar eventos en dashboard_order_events
SELECT 
  'Eventos en dashboard_order_events' as check_type,
  COUNT(*) as count,
  MIN(closed_at) as primer_evento,
  MAX(closed_at) as ultimo_evento
FROM dashboard_order_events;

-- 3. Verificar resúmenes en dashboard_daily_summary
SELECT 
  'Resúmenes en dashboard_daily_summary' as check_type,
  COUNT(*) as count,
  MIN(summary_date) as primera_fecha,
  MAX(summary_date) as ultima_fecha
FROM dashboard_daily_summary;

-- 4. Comparar: órdenes cerradas vs eventos creados
SELECT 
  'Comparación' as check_type,
  (SELECT COUNT(*) FROM orders WHERE status = 'Pagado') as ordenes_cerradas,
  (SELECT COUNT(*) FROM dashboard_order_events) as eventos_creados,
  (SELECT COUNT(*) FROM orders WHERE status = 'Pagado') - (SELECT COUNT(*) FROM dashboard_order_events) as diferencia
;

-- 5. Verificar si el trigger existe y está activo
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as is_enabled,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trg_record_dashboard_order_event'
  AND tgrelid = 'orders'::regclass;

-- 6. Verificar si la función existe
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'record_dashboard_order_event';

-- 7. Listar últimas órdenes cerradas (primeras 10)
SELECT 
  id,
  restaurant_id,
  status,
  total_amount,
  guest_count,
  created_at
FROM orders
WHERE status = 'Pagado'
ORDER BY created_at DESC
LIMIT 10;

-- 8. Listar últimos eventos creados (primeras 10)
SELECT 
  order_id,
  restaurant_id,
  total_amount,
  guest_count,
  closed_at
FROM dashboard_order_events
ORDER BY closed_at DESC
LIMIT 10;

-- 9. Órdenes cerradas que NO tienen evento asociado
SELECT 
  o.id as order_id,
  o.restaurant_id,
  o.status,
  o.total_amount,
  o.created_at
FROM orders o
WHERE o.status = 'Pagado'
  AND NOT EXISTS (
    SELECT 1 FROM dashboard_order_events doe 
    WHERE doe.order_id = o.id
  )
ORDER BY o.created_at DESC
LIMIT 10;

