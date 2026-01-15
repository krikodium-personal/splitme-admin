-- ============================================
-- Script Completo: Diagnosticar, Corregir y Migrar Dashboard
-- ============================================
-- Este script hace TODO: diagnostica, corrige triggers y migra datos históricos
-- ============================================

DO $$
DECLARE
    v_paid_orders_count integer;
    v_events_count integer;
    v_summary_count integer;
    v_events_inserted integer;
    v_summary_inserted integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INICIANDO CORRECCIÓN COMPLETA DEL DASHBOARD';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- PASO 1: Diagnóstico
    RAISE NOTICE 'PASO 1: DIAGNÓSTICO';
    SELECT COUNT(*) INTO v_paid_orders_count 
    FROM orders 
    WHERE status = 'Pagado';
    
    SELECT COUNT(*) INTO v_events_count FROM dashboard_order_events;
    SELECT COUNT(*) INTO v_summary_count FROM dashboard_daily_summary;
    
    RAISE NOTICE '  - Órdenes con status "Pagado": %', v_paid_orders_count;
    RAISE NOTICE '  - Eventos en dashboard_order_events: %', v_events_count;
    RAISE NOTICE '  - Resúmenes en dashboard_daily_summary: %', v_summary_count;
    RAISE NOTICE '';

    -- PASO 2: Corregir triggers
    RAISE NOTICE 'PASO 2: CORRIGIENDO TRIGGERS';
    
    -- Eliminar triggers existentes
    DROP TRIGGER IF EXISTS trg_record_dashboard_order_event ON public.orders;
    DROP TRIGGER IF EXISTS trigger_record_dashboard_order_event ON public.orders;
    DROP TRIGGER IF EXISTS trigger_update_dashboard_daily_summary ON public.dashboard_order_events;
    
    RAISE NOTICE '  ✓ Triggers antiguos eliminados';

    -- Crear/actualizar función
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
        
        -- Actualizar resumen diario directamente aquí
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
    
    RAISE NOTICE '  ✓ Función actualizada';

    -- Crear trigger
    CREATE TRIGGER trg_record_dashboard_order_event
      AFTER UPDATE ON public.orders
      FOR EACH ROW
      WHEN (NEW.status = 'Pagado' AND (OLD.status IS DISTINCT FROM NEW.status))
      EXECUTE FUNCTION public.record_dashboard_order_event();
    
    RAISE NOTICE '  ✓ Trigger creado';
    RAISE NOTICE '';

    -- PASO 3: Migrar datos históricos
    RAISE NOTICE 'PASO 3: MIGRANDO DATOS HISTÓRICOS';
    
    -- Migrar órdenes cerradas a dashboard_order_events
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
    
    GET DIAGNOSTICS v_events_inserted = ROW_COUNT;
    RAISE NOTICE '  ✓ Eventos insertados: %', v_events_inserted;

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
    
    GET DIAGNOSTICS v_summary_inserted = ROW_COUNT;
    RAISE NOTICE '  ✓ Resúmenes diarios insertados/actualizados: %', v_summary_inserted;
    RAISE NOTICE '';

    -- PASO 4: Verificación final
    RAISE NOTICE 'PASO 4: VERIFICACIÓN FINAL';
    SELECT COUNT(*) INTO v_events_count FROM dashboard_order_events;
    SELECT COUNT(*) INTO v_summary_count FROM dashboard_daily_summary;
    
    RAISE NOTICE '  - Eventos totales: %', v_events_count;
    RAISE NOTICE '  - Resúmenes totales: %', v_summary_count;
    RAISE NOTICE '';

    IF v_events_count > 0 AND v_summary_count > 0 THEN
        RAISE NOTICE '  ✅ ¡DASHBOARD CORREGIDO Y FUNCIONANDO!';
        RAISE NOTICE '     El dashboard ahora debería mostrar datos.';
    ELSIF v_paid_orders_count = 0 THEN
        RAISE NOTICE '  ℹ️  No hay órdenes cerradas aún.';
        RAISE NOTICE '     El dashboard se poblará automáticamente cuando cierres tu primera orden.';
    ELSE
        RAISE NOTICE '  ⚠️  Verifica manualmente las tablas dashboard_order_events y dashboard_daily_summary';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECCIÓN COMPLETA FINALIZADA';
    RAISE NOTICE '========================================';

END $$;

-- Mostrar resumen final
SELECT 
    'RESUMEN FINAL' as tipo,
    (SELECT COUNT(*) FROM orders WHERE status = 'Pagado') as ordenes_pagadas,
    (SELECT COUNT(*) FROM dashboard_order_events) as eventos,
    (SELECT COUNT(*) FROM dashboard_daily_summary) as resumenes,
    (SELECT COUNT(DISTINCT restaurant_id) FROM dashboard_order_events) as restaurantes_con_datos;

-- Mostrar algunos eventos de ejemplo
SELECT 
    'EVENTOS (últimos 5)' as tipo,
    order_id::text,
    restaurant_id::text,
    total_amount,
    closed_at
FROM dashboard_order_events
ORDER BY closed_at DESC
LIMIT 5;

-- Mostrar algunos resúmenes de ejemplo
SELECT 
    'RESÚMENES DIARIOS (últimos 5)' as tipo,
    summary_date::text,
    restaurant_id::text,
    total_orders,
    total_sales
FROM dashboard_daily_summary
ORDER BY summary_date DESC
LIMIT 5;
