-- Script para archivar manualmente la orden de la mesa 3 que quedó con status 'Pagado'
-- pero no se archivó automáticamente

-- IMPORTANTE: Reemplaza 'ORDER_ID_AQUI' con el ID real de la orden de la mesa 3
-- Puedes obtenerlo ejecutando primero:
-- SELECT id, table_id, status, created_at FROM orders WHERE status = 'Pagado' ORDER BY created_at DESC;

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid;
    v_table_id uuid;
    v_archived_count integer := 0;
BEGIN
    -- Buscar la orden de la mesa 3 que está pagada pero no archivada
    -- Ajusta el table_id según tu caso específico
    SELECT o.id, o.restaurant_id, o.table_id
    INTO v_order_id, v_restaurant_id, v_table_id
    FROM orders o
    INNER JOIN tables t ON o.table_id = t.id
    WHERE o.status = 'Pagado'
    AND t.table_number = '3'  -- Ajusta según tu caso
    AND NOT EXISTS (SELECT 1 FROM orders_archive oa WHERE oa.id = o.id)
    ORDER BY o.created_at DESC
    LIMIT 1;
    
    IF v_order_id IS NULL THEN
        RAISE NOTICE 'No se encontró una orden pagada de la mesa 3 sin archivar.';
        RAISE NOTICE 'Verificando todas las órdenes pagadas sin archivar...';
        
        -- Mostrar todas las órdenes pagadas sin archivar
        FOR v_order_id, v_restaurant_id, v_table_id IN
            SELECT o.id, o.restaurant_id, o.table_id
            FROM orders o
            WHERE o.status = 'Pagado'
            AND NOT EXISTS (SELECT 1 FROM orders_archive oa WHERE oa.id = o.id)
            ORDER BY o.created_at DESC
            LIMIT 5
        LOOP
            RAISE NOTICE 'Orden encontrada: % (restaurant: %, table: %)', v_order_id, v_restaurant_id, v_table_id;
        END LOOP;
        
        RETURN;
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO ORDEN MANUALMENTE';
    RAISE NOTICE 'Order ID: %', v_order_id;
    RAISE NOTICE 'Restaurant ID: %', v_restaurant_id;
    RAISE NOTICE 'Table ID: %', v_table_id;
    RAISE NOTICE '========================================';
    
    -- Llamar a la función archive_order
    PERFORM archive_order(v_order_id, v_restaurant_id);
    
    RAISE NOTICE '✅ Orden archivada correctamente';
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error al archivar: %', SQLERRM;
        RAISE NOTICE 'Verifica que la función archive_order existe ejecutando check_archive_function.sql';
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN' as tipo,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM orders_archive oa
            INNER JOIN tables t ON oa.table_id = t.id
            WHERE t.table_number = '3'
            AND oa.status = 'Pagado'
            ORDER BY oa.archived_at DESC
            LIMIT 1
        )
        THEN '✅ Orden de mesa 3 archivada correctamente'
        ELSE '⚠️ No se encontró orden archivada de mesa 3'
    END as resultado;
