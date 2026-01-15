-- Script para archivar todas las órdenes pagadas que no están archivadas

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid;
    v_result JSON;
    v_success_count integer := 0;
    v_error_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO TODAS LAS ÓRDENES PAGADAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Iterar sobre todas las órdenes pagadas que no están archivadas
    FOR v_order_id, v_restaurant_id IN
        SELECT o.id, o.restaurant_id
        FROM orders o
        WHERE o.status = 'Pagado'
        AND NOT EXISTS (SELECT 1 FROM orders_archive oa WHERE oa.id = o.id)
        ORDER BY o.created_at DESC
    LOOP
        BEGIN
            RAISE NOTICE 'Archivando orden: % (restaurant: %)', v_order_id, v_restaurant_id;
            
            SELECT archive_order(v_order_id, v_restaurant_id) INTO v_result;
            
            IF (v_result->>'success')::boolean THEN
                v_success_count := v_success_count + 1;
                RAISE NOTICE '  ✅ Archivada correctamente';
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
    'VERIFICACIÓN FINAL' as tipo,
    (SELECT COUNT(*) FROM orders WHERE status = 'Pagado') as ordenes_pagadas_sin_archivar,
    (SELECT COUNT(*) FROM orders_archive WHERE status = 'Pagado') as ordenes_archivadas;
