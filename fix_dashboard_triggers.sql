-- ============================================
-- Corregir Triggers del Dashboard
-- ============================================
-- Este script corrige los triggers para asegurar que funcionen correctamente
-- ============================================

-- 1. Eliminar todos los triggers existentes para empezar limpio
DROP TRIGGER IF EXISTS trg_record_dashboard_order_event ON public.orders;
DROP TRIGGER IF EXISTS trigger_record_dashboard_order_event ON public.orders;
DROP TRIGGER IF EXISTS trigger_update_dashboard_daily_summary ON public.dashboard_order_events;

-- 2. Verificar que las funciones existan, si no, crearlas
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
    
    -- Actualizar resumen diario directamente aquí (en lugar de otro trigger)
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

-- 3. Crear el trigger principal (solo uno)
CREATE TRIGGER trg_record_dashboard_order_event
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'Pagado' AND (OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.record_dashboard_order_event();

-- 4. Verificar que el trigger se creó correctamente
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  CASE tgenabled 
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trg_record_dashboard_order_event'
  AND tgrelid = 'orders'::regclass;

-- 5. Probar manualmente: Crear un evento de prueba (descomentar si necesitas probar)
-- NOTA: Esto solo funciona si hay una orden con status != 'Pagado'
/*
DO $$
DECLARE
  test_order_id UUID;
BEGIN
  -- Buscar una orden que no esté cerrada
  SELECT id INTO test_order_id 
  FROM orders 
  WHERE status != 'Pagado' 
  LIMIT 1;
  
  IF test_order_id IS NOT NULL THEN
    -- Actualizar a Pagado para probar el trigger
    UPDATE orders 
    SET status = 'Pagado' 
    WHERE id = test_order_id;
    
    RAISE NOTICE 'Orden de prueba actualizada: %', test_order_id;
  ELSE
    RAISE NOTICE 'No hay órdenes abiertas para probar el trigger';
  END IF;
END $$;
*/

