-- Script para archivar manualmente órdenes específicas que están pagadas pero no archivadas
-- Order IDs: c537e51a-6e61-4d52-82dd-64b42903f032 y c787ed4d-7fa8-4c71-be8d-1d554b99c557

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_result JSON;
    v_success_count integer := 0;
    v_error_count integer := 0;
    v_order_ids uuid[] := ARRAY[
        'c537e51a-6e61-4d52-82dd-64b42903f032'::uuid,
        'c787ed4d-7fa8-4c71-be8d-1d554b99c557'::uuid
    ];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO ÓRDENES ESPECÍFICAS';
    RAISE NOTICE 'Restaurant ID: %', v_restaurant_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Iterar sobre las órdenes específicas
    FOREACH v_order_id IN ARRAY v_order_ids
    LOOP
        BEGIN
            -- Verificar que la orden existe y está pagada
            IF NOT EXISTS (
                SELECT 1 FROM orders o
                WHERE o.id = v_order_id
                AND o.restaurant_id = v_restaurant_id
                AND o.status = 'Pagado'
            ) THEN
                RAISE NOTICE '⚠️ Orden % no existe, no está pagada, o no pertenece al restaurante', v_order_id;
                v_error_count := v_error_count + 1;
                CONTINUE;
            END IF;
            
            -- Verificar si ya está archivada
            IF EXISTS (
                SELECT 1 FROM orders_archive oa
                WHERE oa.id = v_order_id
            ) THEN
                RAISE NOTICE '⚠️ Orden % ya está archivada', v_order_id;
                CONTINUE;
            END IF;
            
            RAISE NOTICE 'Archivando orden: %', v_order_id;
            
            -- Llamar a la función archive_order
            SELECT archive_order(v_order_id, v_restaurant_id) INTO v_result;
            
            IF (v_result->>'success')::boolean THEN
                v_success_count := v_success_count + 1;
                RAISE NOTICE '  ✅ Archivada correctamente';
                RAISE NOTICE '     - Registros archivados: %', v_result->>'archived_records';
            ELSE
                v_error_count := v_error_count + 1;
                RAISE NOTICE '  ❌ Error: %', v_result->>'error';
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                v_error_count := v_error_count + 1;
                RAISE NOTICE '  ❌ Excepción: %', SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Órdenes archivadas exitosamente: %', v_success_count;
    RAISE NOTICE 'Órdenes con error: %', v_error_count;
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN' as tipo,
    o.id::text as order_id,
    o.status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders_archive oa WHERE oa.id = o.id)
        THEN '✅ Archivada'
        ELSE '❌ NO archivada'
    END as estado
FROM orders o
WHERE o.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
AND o.status = 'Pagado';

-- Verificar en orders_archive
SELECT 
    'VERIFICACIÓN EN ARCHIVE' as tipo,
    oa.id::text as order_id,
    oa.status,
    oa.archived_at
FROM orders_archive oa
WHERE oa.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
);
