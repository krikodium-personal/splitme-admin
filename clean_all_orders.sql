-- ============================================
-- LIMPIAR TODAS LAS ÓRDENES Y DATOS RELACIONADOS
-- ============================================
-- ⚠️ ADVERTENCIA: Este script elimina TODOS los datos de órdenes
-- Ejecuta solo si estás seguro de empezar de cero
-- ============================================

DO $$
DECLARE
    v_count integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LIMPIANDO TODAS LAS ÓRDENES Y DATOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ ADVERTENCIA: Esto eliminará TODOS los datos de órdenes';
    RAISE NOTICE '';
    
    -- 1. Limpiar tablas de dashboard (opcional - descomentar si también quieres limpiar el dashboard)
    /*
    RAISE NOTICE 'Limpiando dashboard...';
    DELETE FROM dashboard_daily_summary;
    DELETE FROM dashboard_order_events;
    RAISE NOTICE '✅ Dashboard limpiado';
    RAISE NOTICE '';
    */
    
    -- 2. Eliminar de tablas activas (en orden inverso por dependencias)
    RAISE NOTICE 'Limpiando tablas activas...';
    
    -- Items
    DELETE FROM order_items;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   order_items eliminados: %', v_count;
    
    -- Batches
    DELETE FROM order_batches;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   order_batches eliminados: %', v_count;
    
    -- Guests
    DELETE FROM order_guests;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   order_guests eliminados: %', v_count;
    
    -- Payments
    DELETE FROM payments;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   payments eliminados: %', v_count;
    
    -- Orders
    DELETE FROM orders;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   orders eliminados: %', v_count;
    
    RAISE NOTICE '✅ Tablas activas limpiadas';
    RAISE NOTICE '';
    
    -- 3. Eliminar de tablas archivadas (en orden inverso por dependencias)
    RAISE NOTICE 'Limpiando tablas archivadas...';
    
    -- Items archivados
    DELETE FROM order_items_archive;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   order_items_archive eliminados: %', v_count;
    
    -- Batches archivados
    DELETE FROM order_batches_archive;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   order_batches_archive eliminados: %', v_count;
    
    -- Guests archivados
    DELETE FROM order_guests_archive;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   order_guests_archive eliminados: %', v_count;
    
    -- Payments archivados
    DELETE FROM payments_archive;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   payments_archive eliminados: %', v_count;
    
    -- Orders archivados
    DELETE FROM orders_archive;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '   orders_archive eliminados: %', v_count;
    
    RAISE NOTICE '✅ Tablas archivadas limpiadas';
    RAISE NOTICE '';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LIMPIEZA COMPLETADA';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificación final
SELECT 
    'VERIFICACIÓN FINAL - ORDERS' as tipo,
    COUNT(*) as cantidad
FROM orders;

SELECT 
    'VERIFICACIÓN FINAL - ORDERS_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM orders_archive;

SELECT 
    'VERIFICACIÓN FINAL - ORDER_BATCHES' as tipo,
    COUNT(*) as cantidad
FROM order_batches;

SELECT 
    'VERIFICACIÓN FINAL - ORDER_BATCHES_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM order_batches_archive;

SELECT 
    'VERIFICACIÓN FINAL - ORDER_GUESTS' as tipo,
    COUNT(*) as cantidad
FROM order_guests;

SELECT 
    'VERIFICACIÓN FINAL - ORDER_GUESTS_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM order_guests_archive;
