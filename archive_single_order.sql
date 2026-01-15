-- Script para archivar una orden específica
-- Order ID: c787ed4d-7fa8-4c71-be8d-1d554b99c557

DO $$
DECLARE
    v_order_id uuid := 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_count integer;
    v_test_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO ORDEN: %', v_order_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Verificar que la orden existe
    RAISE NOTICE 'Verificando que la orden existe...';
    SELECT COUNT(*) INTO v_count
    FROM orders o
    WHERE o.id = v_order_id
    AND o.restaurant_id = v_restaurant_id
    AND o.status = 'Pagado';
    
    IF v_count = 0 THEN
        RAISE NOTICE '❌ Orden no encontrada o no cumple condiciones';
        RETURN;
    END IF;
    RAISE NOTICE '✅ Orden encontrada';
    RAISE NOTICE '';
    
    -- Verificar si ya está archivada
    SELECT COUNT(*) INTO v_count
    FROM orders_archive oa
    WHERE oa.id = v_order_id;
    
    IF v_count > 0 THEN
        RAISE NOTICE '⚠️ Orden ya está archivada';
        RETURN;
    END IF;
    
    -- Archivar la orden principal
    RAISE NOTICE 'Archivando orden principal...';
    BEGIN
        INSERT INTO orders_archive
        SELECT *, NOW() as archived_at
        FROM orders o
        WHERE o.id = v_order_id
        AND o.restaurant_id = v_restaurant_id
        RETURNING id INTO v_test_id;
        
        RAISE NOTICE '✅ Orden archivada: %', v_test_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR al archivar orden:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
            RETURN;
    END;
    
    -- Archivar batches
    RAISE NOTICE 'Archivando batches...';
    BEGIN
        INSERT INTO order_batches_archive
        SELECT *, NOW() as archived_at
        FROM order_batches ob
        WHERE ob.order_id = v_order_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ Batches archivados: %', v_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error al archivar batches: %', SQLERRM;
    END;
    
    -- Archivar items
    RAISE NOTICE 'Archivando items...';
    BEGIN
        INSERT INTO order_items_archive
        SELECT oi.*, NOW() as archived_at
        FROM order_items oi
        INNER JOIN order_batches ob ON oi.batch_id = ob.id
        WHERE ob.order_id = v_order_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ Items archivados: %', v_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error al archivar items: %', SQLERRM;
    END;
    
    -- Archivar guests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
        RAISE NOTICE 'Archivando guests...';
        BEGIN
            INSERT INTO order_guests_archive
            SELECT *, NOW() as archived_at
            FROM order_guests og
            WHERE og.order_id = v_order_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '✅ Guests archivados: %', v_count;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Error al archivar guests: %', SQLERRM;
        END;
    END IF;
    
    -- Archivar payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_archive') THEN
        RAISE NOTICE 'Archivando payments...';
        BEGIN
            INSERT INTO payments_archive
            SELECT *, NOW() as archived_at
            FROM payments p
            WHERE p.order_id = v_order_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '✅ Payments archivados: %', v_count;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Error al archivar payments: %', SQLERRM;
        END;
    END IF;
    
    -- Eliminar de tablas activas
    RAISE NOTICE 'Eliminando de tablas activas...';
    
    -- Items
    DELETE FROM order_items oi
    WHERE oi.batch_id IN (SELECT ob.id FROM order_batches ob WHERE ob.order_id = v_order_id);
    
    -- Batches
    DELETE FROM order_batches ob WHERE ob.order_id = v_order_id;
    
    -- Guests
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
        DELETE FROM order_guests og WHERE og.order_id = v_order_id;
    END IF;
    
    -- Payments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_archive') THEN
        DELETE FROM payments p WHERE p.order_id = v_order_id;
    END IF;
    
    -- Orden
    DELETE FROM orders o WHERE o.id = v_order_id AND o.restaurant_id = v_restaurant_id;
    
    RAISE NOTICE '✅ Datos eliminados de tablas activas';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVADO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN EN ORDERS' as tipo,
    COUNT(*) as cantidad
FROM orders
WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';

SELECT 
    'VERIFICACIÓN EN ORDERS_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM orders_archive
WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';
