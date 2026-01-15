-- Script para archivar órdenes directamente sin usar la función
-- Esto nos ayudará a identificar si el problema es la función o algo más

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_archived_order_id uuid;
    v_order_ids uuid[] := ARRAY[
        'c537e51a-6e61-4d52-82dd-64b42903f032'::uuid,
        'c787ed4d-7fa8-4c71-be8d-1d554b99c557'::uuid
    ];
    v_count integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO ÓRDENES DIRECTAMENTE (SIN FUNCIÓN)';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    FOREACH v_order_id IN ARRAY v_order_ids
    LOOP
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE 'Procesando orden: %', v_order_id;
        RAISE NOTICE '----------------------------------------';
        
        -- Verificar que la orden existe y está pagada
        SELECT COUNT(*) INTO v_count
        FROM orders o
        WHERE o.id = v_order_id
        AND o.restaurant_id = v_restaurant_id
        AND o.status = 'Pagado';
        
        IF v_count = 0 THEN
            RAISE NOTICE '❌ Orden no encontrada o no cumple condiciones';
            CONTINUE;
        END IF;
        
        -- Verificar si ya está archivada
        SELECT COUNT(*) INTO v_count
        FROM orders_archive oa
        WHERE oa.id = v_order_id;
        
        IF v_count > 0 THEN
            RAISE NOTICE '⚠️ Orden ya está archivada';
            CONTINUE;
        END IF;
        
        RAISE NOTICE '✅ Orden válida, procediendo a archivar...';
        
        BEGIN
            -- 1. Archivar la orden principal
            INSERT INTO orders_archive
            SELECT *, NOW() as archived_at
            FROM orders o
            WHERE o.id = v_order_id
            AND o.restaurant_id = v_restaurant_id
            RETURNING id INTO v_archived_order_id;
            
            RAISE NOTICE '  ✅ Orden archivada: %', v_archived_order_id;
            
            -- 2. Archivar batches
            INSERT INTO order_batches_archive
            SELECT *, NOW() as archived_at
            FROM order_batches ob
            WHERE ob.order_id = v_order_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  ✅ Batches archivados: %', v_count;
            
            -- 3. Archivar items
            INSERT INTO order_items_archive
            SELECT oi.*, NOW() as archived_at
            FROM order_items oi
            INNER JOIN order_batches ob ON oi.batch_id = ob.id
            WHERE ob.order_id = v_order_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '  ✅ Items archivados: %', v_count;
            
            -- 4. Archivar guests (si existe la tabla)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
                INSERT INTO order_guests_archive
                SELECT *, NOW() as archived_at
                FROM order_guests og
                WHERE og.order_id = v_order_id;
                
                GET DIAGNOSTICS v_count = ROW_COUNT;
                RAISE NOTICE '  ✅ Guests archivados: %', v_count;
            END IF;
            
            -- 5. Archivar payments (si existe la tabla)
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_archive') THEN
                INSERT INTO payments_archive
                SELECT *, NOW() as archived_at
                FROM payments p
                WHERE p.order_id = v_order_id;
                
                GET DIAGNOSTICS v_count = ROW_COUNT;
                RAISE NOTICE '  ✅ Payments archivados: %', v_count;
            END IF;
            
            -- 6. Eliminar de tablas activas (en orden inverso)
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
            
            RAISE NOTICE '  ✅ Datos eliminados de tablas activas';
            RAISE NOTICE '  ✅ Orden % archivada completamente', v_order_id;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '  ❌ ERROR al archivar:';
                RAISE NOTICE '     Código: %', SQLSTATE;
                RAISE NOTICE '     Mensaje: %', SQLERRM;
                RAISE NOTICE '     Detalle: %', SQLERRM;
        END;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROCESO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN EN ORDERS' as tipo,
    COUNT(*) as cantidad
FROM orders
WHERE id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
AND status = 'Pagado';

SELECT 
    'VERIFICACIÓN EN ORDERS_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM orders_archive
WHERE id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
);
