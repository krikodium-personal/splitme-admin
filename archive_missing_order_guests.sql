-- Script para archivar los order_guests faltantes de las mesas 3 y 4

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_count integer;
    v_order_ids uuid[] := ARRAY[
        'c537e51a-6e61-4d52-82dd-64b42903f032'::uuid,  -- Mesa 3
        'c787ed4d-7fa8-4c71-be8d-1d554b99c557'::uuid  -- Mesa 4
    ];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO ORDER_GUESTS FALTANTES';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    FOREACH v_order_id IN ARRAY v_order_ids
    LOOP
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE 'Procesando orden: %', v_order_id;
        RAISE NOTICE '----------------------------------------';
        
        -- Verificar si la orden está archivada
        IF NOT EXISTS (
            SELECT 1 FROM orders_archive oa
            WHERE oa.id = v_order_id
        ) THEN
            RAISE NOTICE '⚠️ Orden no está archivada, saltando...';
            CONTINUE;
        END IF;
        
        -- Verificar si ya tiene order_guests archivados
        SELECT COUNT(*) INTO v_count
        FROM order_guests_archive og
        WHERE og.order_id = v_order_id;
        
        IF v_count > 0 THEN
            RAISE NOTICE '✅ Ya tiene % order_guests archivados', v_count;
            CONTINUE;
        END IF;
        
        -- Buscar order_guests en la tabla activa
        SELECT COUNT(*) INTO v_count
        FROM order_guests og
        WHERE og.order_id = v_order_id;
        
        IF v_count = 0 THEN
            RAISE NOTICE '⚠️ No se encontraron order_guests en tabla activa';
            RAISE NOTICE '   Puede que nunca existieron o ya fueron eliminados';
            CONTINUE;
        END IF;
        
        RAISE NOTICE '✅ Encontrados % order_guests en tabla activa', v_count;
        RAISE NOTICE '   Archivando...';
        
        BEGIN
            -- Archivar order_guests
            INSERT INTO order_guests_archive
            SELECT *, NOW() as archived_at
            FROM order_guests og
            WHERE og.order_id = v_order_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '   ✅ % order_guests archivados', v_count;
            
            -- Eliminar de tabla activa
            DELETE FROM order_guests og
            WHERE og.order_id = v_order_id;
            
            RAISE NOTICE '   ✅ Eliminados de tabla activa';
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '   ❌ ERROR:';
                RAISE NOTICE '      Código: %', SQLSTATE;
                RAISE NOTICE '      Mensaje: %', SQLERRM;
        END;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROCESO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN FINAL' as tipo,
    oa.id::text as order_id,
    t.table_number,
    (SELECT COUNT(*) FROM order_guests_archive og WHERE og.order_id = oa.id) as guests_archivados,
    (SELECT COUNT(*) FROM order_guests og WHERE og.order_id = oa.id) as guests_en_activa
FROM orders_archive oa
INNER JOIN tables t ON oa.table_id = t.id
WHERE oa.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY t.table_number;
