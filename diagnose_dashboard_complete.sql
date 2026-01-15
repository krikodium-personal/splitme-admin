-- Script completo de diagnóstico del dashboard
-- Verifica el estado de órdenes, triggers y tablas de dashboard

DO $$
DECLARE
    v_restaurant_id uuid;
    v_orders_count integer;
    v_paid_orders_count integer;
    v_events_count integer;
    v_summary_count integer;
    v_trigger_exists boolean;
    v_function_exists boolean;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNÓSTICO COMPLETO DEL DASHBOARD';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- 1. Verificar si existen las tablas
    RAISE NOTICE '1. VERIFICACIÓN DE TABLAS:';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_order_events') THEN
        RAISE NOTICE '   ✓ dashboard_order_events existe';
    ELSE
        RAISE NOTICE '   ✗ dashboard_order_events NO existe';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_daily_summary') THEN
        RAISE NOTICE '   ✓ dashboard_daily_summary existe';
    ELSE
        RAISE NOTICE '   ✗ dashboard_daily_summary NO existe';
    END IF;

    RAISE NOTICE '';

    -- 2. Contar órdenes totales y cerradas
    RAISE NOTICE '2. ESTADO DE ÓRDENES:';
    SELECT COUNT(*) INTO v_orders_count FROM orders;
    RAISE NOTICE '   Total de órdenes: %', v_orders_count;

    SELECT COUNT(*) INTO v_paid_orders_count 
    FROM orders 
    WHERE status = 'Pagado';
    RAISE NOTICE '   Órdenes con status "Pagado": %', v_paid_orders_count;

    -- Mostrar algunas órdenes pagadas como ejemplo
    RAISE NOTICE '   Ejemplos de órdenes pagadas:';
    FOR v_restaurant_id IN 
        SELECT DISTINCT restaurant_id 
        FROM orders 
        WHERE status = 'Pagado' 
        LIMIT 5
    LOOP
        RAISE NOTICE '     - Restaurant ID: %', v_restaurant_id;
    END LOOP;

    RAISE NOTICE '';

    -- 3. Contar eventos y resúmenes
    RAISE NOTICE '3. ESTADO DE TABLAS DE DASHBOARD:';
    SELECT COUNT(*) INTO v_events_count FROM dashboard_order_events;
    RAISE NOTICE '   Registros en dashboard_order_events: %', v_events_count;

    SELECT COUNT(*) INTO v_summary_count FROM dashboard_daily_summary;
    RAISE NOTICE '   Registros en dashboard_daily_summary: %', v_summary_count;

    -- Mostrar algunos eventos como ejemplo
    IF v_events_count > 0 THEN
        RAISE NOTICE '   Ejemplos de eventos:';
        FOR v_restaurant_id IN 
            SELECT DISTINCT restaurant_id 
            FROM dashboard_order_events 
            LIMIT 3
        LOOP
            RAISE NOTICE '     - Restaurant ID: %', v_restaurant_id;
        END LOOP;
    END IF;

    RAISE NOTICE '';

    -- 4. Verificar triggers
    RAISE NOTICE '4. VERIFICACIÓN DE TRIGGERS:';
    SELECT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_record_dashboard_order_event'
    ) INTO v_trigger_exists;

    IF v_trigger_exists THEN
        RAISE NOTICE '   ✓ Trigger "trigger_record_dashboard_order_event" existe';
        
        -- Verificar si está habilitado
        SELECT tgisinternal INTO v_trigger_exists
        FROM pg_trigger 
        WHERE tgname = 'trigger_record_dashboard_order_event';
        
        RAISE NOTICE '   Estado del trigger: activo';
    ELSE
        RAISE NOTICE '   ✗ Trigger "trigger_record_dashboard_order_event" NO existe';
    END IF;

    RAISE NOTICE '';

    -- 5. Verificar función
    RAISE NOTICE '5. VERIFICACIÓN DE FUNCIÓN:';
    SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'record_dashboard_order_event'
    ) INTO v_function_exists;

    IF v_function_exists THEN
        RAISE NOTICE '   ✓ Función "record_dashboard_order_event" existe';
    ELSE
        RAISE NOTICE '   ✗ Función "record_dashboard_order_event" NO existe';
    END IF;

    RAISE NOTICE '';

    -- 6. Análisis de discrepancia
    RAISE NOTICE '6. ANÁLISIS:';
    IF v_paid_orders_count > 0 AND v_events_count = 0 THEN
        RAISE NOTICE '   ⚠️ PROBLEMA DETECTADO:';
        RAISE NOTICE '      - Hay % órdenes pagadas pero 0 eventos en dashboard', v_paid_orders_count;
        RAISE NOTICE '      - Esto indica que el trigger NO se está ejecutando';
        RAISE NOTICE '      - SOLUCIÓN: Ejecutar fix_dashboard_triggers.sql y luego migrate_historical_dashboard_data.sql';
    ELSIF v_paid_orders_count = 0 THEN
        RAISE NOTICE '   ℹ️  No hay órdenes pagadas aún';
        RAISE NOTICE '      - El dashboard se poblará automáticamente cuando cierres tu primera orden';
    ELSIF v_events_count > 0 AND v_summary_count = 0 THEN
        RAISE NOTICE '   ⚠️ PROBLEMA DETECTADO:';
        RAISE NOTICE '      - Hay eventos pero no hay resúmenes diarios';
        RAISE NOTICE '      - Esto indica que el trigger de resumen NO se está ejecutando';
        RAISE NOTICE '      - SOLUCIÓN: Ejecutar create_dashboard_summary_table.sql';
    ELSIF v_events_count > 0 AND v_summary_count > 0 THEN
        RAISE NOTICE '   ✓ Sistema funcionando correctamente';
        RAISE NOTICE '      - Hay % eventos y % resúmenes diarios', v_events_count, v_summary_count;
    ELSE
        RAISE NOTICE '   ✓ Sistema inicializado correctamente (sin datos aún)';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIN DEL DIAGNÓSTICO';
    RAISE NOTICE '========================================';

END $$;

-- Mostrar algunos registros de ejemplo
SELECT 
    'Órdenes Pagadas (últimas 5)' as tipo,
    id::text as order_id,
    restaurant_id::text,
    status,
    total_amount,
    created_at
FROM orders 
WHERE status = 'Pagado'
ORDER BY created_at DESC
LIMIT 5;

SELECT 
    'Eventos Dashboard (últimos 5)' as tipo,
    order_id::text,
    restaurant_id::text,
    total_amount,
    closed_at
FROM dashboard_order_events
ORDER BY closed_at DESC
LIMIT 5;

SELECT 
    'Resúmenes Diarios (últimos 5)' as tipo,
    summary_date::text,
    restaurant_id::text,
    total_orders,
    total_sales
FROM dashboard_daily_summary
ORDER BY summary_date DESC
LIMIT 5;
