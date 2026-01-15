-- ============================================
-- Migrar datos del dashboard para un restaurante específico
-- ============================================
-- Este script migra todas las órdenes pagadas de un restaurante específico
-- ============================================

DO $$
DECLARE
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_paid_orders_count integer;
    v_events_inserted integer;
    v_summary_inserted integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRANDO DATOS DEL DASHBOARD';
    RAISE NOTICE 'Restaurant ID: %', v_restaurant_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 1. Contar órdenes pagadas de este restaurante (SOLO en orders_archive)
    -- Las órdenes con status 'Pagado' SIEMPRE están en orders_archive
    SELECT COUNT(*) INTO v_paid_orders_count 
    FROM orders_archive 
    WHERE status = 'Pagado' 
    AND restaurant_id = v_restaurant_id;
    
    RAISE NOTICE 'Órdenes pagadas encontradas en orders_archive: %', v_paid_orders_count;
    RAISE NOTICE '';

    IF v_paid_orders_count = 0 THEN
        RAISE NOTICE '⚠️  No hay órdenes pagadas para este restaurante.';
        RAISE NOTICE '    El dashboard se poblará automáticamente cuando cierres tu primera orden.';
        RETURN;
    END IF;

    -- 2. Migrar órdenes cerradas a dashboard_order_events (desde orders_archive)
    RAISE NOTICE 'Migrando eventos desde orders_archive...';
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
      COALESCE(archived_at, created_at) as closed_at,
      NOW()
    FROM orders_archive o
    WHERE status = 'Pagado'
      AND restaurant_id = v_restaurant_id
      AND NOT EXISTS (
        SELECT 1 FROM dashboard_order_events doe 
        WHERE doe.order_id = o.id
      );
    
    GET DIAGNOSTICS v_events_inserted = ROW_COUNT;
    RAISE NOTICE '  ✓ Eventos insertados desde orders_archive: %', v_events_inserted;
    
    GET DIAGNOSTICS v_events_inserted = ROW_COUNT;
    RAISE NOTICE '  ✓ Eventos insertados: %', v_events_inserted;
    RAISE NOTICE '';

    -- 3. Migrar a dashboard_daily_summary (agregar por día)
    RAISE NOTICE 'Migrando resúmenes diarios...';
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
    WHERE restaurant_id = v_restaurant_id
      AND NOT EXISTS (
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

    -- 4. Verificación final
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO v_events_inserted 
    FROM dashboard_order_events 
    WHERE restaurant_id = v_restaurant_id;
    
    SELECT COUNT(*) INTO v_summary_inserted 
    FROM dashboard_daily_summary 
    WHERE restaurant_id = v_restaurant_id;
    
    RAISE NOTICE 'Eventos totales para este restaurante: %', v_events_inserted;
    RAISE NOTICE 'Resúmenes totales para este restaurante: %', v_summary_inserted;
    RAISE NOTICE '';
    
    IF v_events_inserted > 0 AND v_summary_inserted > 0 THEN
        RAISE NOTICE '✅ ¡MIGRACIÓN COMPLETA!';
        RAISE NOTICE '    Recarga el dashboard para ver los datos.';
    ELSE
        RAISE NOTICE '⚠️  Verifica manualmente las tablas.';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';

END $$;

-- Mostrar resumen final
SELECT 
    'RESUMEN FINAL' as tipo,
    (SELECT COUNT(*) FROM orders WHERE status = 'Pagado' AND restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d') as ordenes_pagadas,
    (SELECT COUNT(*) FROM dashboard_order_events WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d') as eventos,
    (SELECT COUNT(*) FROM dashboard_daily_summary WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d') as resumenes;

-- Mostrar algunos eventos de ejemplo
SELECT 
    'EVENTOS (últimos 5)' as tipo,
    order_id::text,
    total_amount,
    closed_at
FROM dashboard_order_events
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
ORDER BY closed_at DESC
LIMIT 5;

-- Mostrar algunos resúmenes de ejemplo
SELECT 
    'RESÚMENES DIARIOS (últimos 5)' as tipo,
    summary_date::text,
    total_orders,
    total_sales
FROM dashboard_daily_summary
WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
ORDER BY summary_date DESC
LIMIT 5;
