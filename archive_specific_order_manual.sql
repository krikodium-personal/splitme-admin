-- Script para archivar manualmente la orden específica que no se archivó
-- Order ID: c537e51a-6e61-4d52-82dd-64b42903f032

DO $$
DECLARE
    v_order_id uuid := 'c537e51a-6e61-4d52-82dd-64b42903f032';
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_result JSON;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ARCHIVANDO ORDEN MANUALMENTE';
    RAISE NOTICE 'Order ID: %', v_order_id;
    RAISE NOTICE 'Restaurant ID: %', v_restaurant_id;
    RAISE NOTICE '========================================';
    
    -- Verificar que la orden existe y está pagada
    IF NOT EXISTS (
        SELECT 1 FROM orders 
        WHERE id = v_order_id 
        AND restaurant_id = v_restaurant_id
        AND status = 'Pagado'
    ) THEN
        RAISE NOTICE '❌ La orden no existe, no está pagada, o no pertenece al restaurante';
        RETURN;
    END IF;
    
    -- Verificar si ya está archivada
    IF EXISTS (
        SELECT 1 FROM orders_archive 
        WHERE id = v_order_id
    ) THEN
        RAISE NOTICE '⚠️ La orden ya está archivada';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Orden encontrada y lista para archivar';
    
    -- Llamar a la función archive_order (con los nuevos nombres de parámetros)
    BEGIN
        SELECT archive_order(v_order_id, v_restaurant_id) INTO v_result;
        
        RAISE NOTICE 'Resultado: %', v_result;
        
        IF (v_result->>'success')::boolean THEN
            RAISE NOTICE '✅ Orden archivada correctamente';
            RAISE NOTICE '   - Order ID: %', v_result->>'order_id';
            RAISE NOTICE '   - Registros archivados: %', v_result->>'archived_records';
            RAISE NOTICE '   - Fecha de archivado: %', v_result->>'archived_at';
        ELSE
            RAISE NOTICE '❌ Error al archivar: %', v_result->>'error';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Error al ejecutar archive_order: %', SQLERRM;
            RAISE NOTICE '   Verifica que la función existe ejecutando: check_archive_function.sql';
    END;
    
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders_archive WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032')
        THEN '✅ Orden archivada correctamente'
        ELSE '❌ Orden NO archivada'
    END as resultado,
    (SELECT COUNT(*) FROM orders WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032') as en_orders,
    (SELECT COUNT(*) FROM orders_archive WHERE id = 'c537e51a-6e61-4d52-82dd-64b42903f032') as en_orders_archive;
