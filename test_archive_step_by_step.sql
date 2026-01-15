-- Script para probar el archivado paso a paso y identificar el problema

DO $$
DECLARE
    v_order_id uuid := 'c537e51a-6e61-4d52-82dd-64b42903f032';
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_count integer;
    v_test_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRUEBA PASO A PASO DE ARCHIVADO';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- PASO 1: Verificar que la orden existe
    RAISE NOTICE 'PASO 1: Verificando que la orden existe...';
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
    
    -- PASO 2: Verificar que orders_archive existe y tiene la estructura correcta
    RAISE NOTICE 'PASO 2: Verificando tabla orders_archive...';
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders_archive') THEN
        RAISE NOTICE '❌ Tabla orders_archive NO existe';
        RETURN;
    END IF;
    RAISE NOTICE '✅ Tabla orders_archive existe';
    RAISE NOTICE '';
    
    -- PASO 3: Intentar INSERT en orders_archive
    RAISE NOTICE 'PASO 3: Intentando INSERT en orders_archive...';
    BEGIN
        INSERT INTO orders_archive
        SELECT *, NOW() as archived_at
        FROM orders o
        WHERE o.id = v_order_id
        AND o.restaurant_id = v_restaurant_id
        RETURNING id INTO v_test_id;
        
        RAISE NOTICE '✅ INSERT exitoso. ID archivado: %', v_test_id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR en INSERT:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
            RETURN;
    END;
    RAISE NOTICE '';
    
    -- PASO 4: Verificar que se insertó
    RAISE NOTICE 'PASO 4: Verificando que se insertó correctamente...';
    SELECT COUNT(*) INTO v_count
    FROM orders_archive oa
    WHERE oa.id = v_order_id;
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ Orden encontrada en orders_archive';
    ELSE
        RAISE NOTICE '❌ Orden NO encontrada en orders_archive después del INSERT';
    END IF;
    RAISE NOTICE '';
    
    -- PASO 5: Intentar DELETE de orders
    RAISE NOTICE 'PASO 5: Intentando DELETE de orders...';
    BEGIN
        DELETE FROM orders o 
        WHERE o.id = v_order_id 
        AND o.restaurant_id = v_restaurant_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ DELETE ejecutado. Filas afectadas: %', v_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR en DELETE:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
    END;
    RAISE NOTICE '';
    
    -- PASO 6: Verificar estado final
    RAISE NOTICE 'PASO 6: Verificando estado final...';
    SELECT COUNT(*) INTO v_count
    FROM orders o
    WHERE o.id = v_order_id;
    
    IF v_count = 0 THEN
        RAISE NOTICE '✅ Orden eliminada de orders';
    ELSE
        RAISE NOTICE '⚠️ Orden aún existe en orders';
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM orders_archive oa
    WHERE oa.id = v_order_id;
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ Orden existe en orders_archive';
    ELSE
        RAISE NOTICE '❌ Orden NO existe en orders_archive';
    END IF;
    RAISE NOTICE '';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIN DE LA PRUEBA';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'EN ORDERS' as tabla,
    COUNT(*) as cantidad
FROM orders
WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032';

SELECT 
    'EN ORDERS_ARCHIVE' as tabla,
    COUNT(*) as cantidad
FROM orders_archive
WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032';
