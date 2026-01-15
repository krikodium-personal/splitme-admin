-- Script para diagnosticar por qué las órdenes no se están archivando

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_result JSON;
    v_order_ids uuid[] := ARRAY[
        'c537e51a-6e61-4d52-82dd-64b42903f032'::uuid,
        'c787ed4d-7fa8-4c71-be8d-1d554b99c557'::uuid
    ];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DIAGNÓSTICO DE ARCHIVADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Verificar que la función existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'archive_order'
    ) THEN
        RAISE NOTICE '❌ La función archive_order NO existe';
        RAISE NOTICE '   Ejecuta archive_order_function.sql primero';
        RETURN;
    ELSE
        RAISE NOTICE '✅ La función archive_order existe';
    END IF;
    RAISE NOTICE '';

    -- Verificar cada orden
    FOREACH v_order_id IN ARRAY v_order_ids
    LOOP
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE 'Analizando orden: %', v_order_id;
        RAISE NOTICE '----------------------------------------';
        
        -- Verificar si existe en orders
        IF EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = v_order_id
        ) THEN
            RAISE NOTICE '✅ Orden existe en tabla orders';
            
            -- Verificar status
            IF EXISTS (
                SELECT 1 FROM orders o
                WHERE o.id = v_order_id
                AND o.status = 'Pagado'
            ) THEN
                RAISE NOTICE '✅ Status es "Pagado"';
            ELSE
                RAISE NOTICE '❌ Status NO es "Pagado"';
                SELECT status INTO v_result FROM orders WHERE id = v_order_id;
                RAISE NOTICE '   Status actual: %', v_result;
            END IF;
            
            -- Verificar restaurant_id
            IF EXISTS (
                SELECT 1 FROM orders o
                WHERE o.id = v_order_id
                AND o.restaurant_id = v_restaurant_id
            ) THEN
                RAISE NOTICE '✅ Pertenece al restaurante correcto';
            ELSE
                RAISE NOTICE '❌ NO pertenece al restaurante correcto';
                SELECT restaurant_id INTO v_result FROM orders WHERE id = v_order_id;
                RAISE NOTICE '   Restaurant ID actual: %', v_result;
            END IF;
        ELSE
            RAISE NOTICE '❌ Orden NO existe en tabla orders';
        END IF;
        
        -- Verificar si ya está archivada
        IF EXISTS (
            SELECT 1 FROM orders_archive oa
            WHERE oa.id = v_order_id
        ) THEN
            RAISE NOTICE '⚠️ Orden ya está archivada';
        ELSE
            RAISE NOTICE 'ℹ️ Orden NO está archivada aún';
        END IF;
        
        -- Intentar archivar y capturar el resultado
        BEGIN
            RAISE NOTICE 'Intentando archivar...';
            SELECT archive_order(v_order_id, v_restaurant_id) INTO v_result;
            
            RAISE NOTICE 'Resultado de archive_order: %', v_result;
            
            IF (v_result->>'success')::boolean THEN
                RAISE NOTICE '✅ Archivado exitoso';
                RAISE NOTICE '   - Registros archivados: %', v_result->>'archived_records';
            ELSE
                RAISE NOTICE '❌ Error en archivado: %', v_result->>'error';
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ EXCEPCIÓN al ejecutar archive_order:';
                RAISE NOTICE '   - Código: %', SQLSTATE;
                RAISE NOTICE '   - Mensaje: %', SQLERRM;
        END;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIN DEL DIAGNÓSTICO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar estado final
SELECT 
    'ESTADO FINAL EN ORDERS' as tipo,
    o.id::text as order_id,
    o.status,
    o.restaurant_id::text,
    o.created_at
FROM orders o
WHERE o.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
);

SELECT 
    'ESTADO FINAL EN ORDERS_ARCHIVE' as tipo,
    oa.id::text as order_id,
    oa.status,
    oa.archived_at
FROM orders_archive oa
WHERE oa.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
);
