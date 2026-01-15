-- Script para mover el batch CREADO de vuelta a order_batches
-- Esto requiere mover temporalmente la orden de vuelta a orders

DO $$
DECLARE
    v_batch_id uuid := '40d8624b-0684-449a-86ef-41e20fb7fee3';
    v_order_id uuid := 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_count integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MOVIENDO BATCH CREADO A ORDER_BATCHES';
    RAISE NOTICE 'Esto requiere mover temporalmente la orden';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- PASO 1: Mover temporalmente la orden de vuelta a orders
    RAISE NOTICE 'PASO 1: Moviendo orden temporalmente a orders...';
    
    BEGIN
        -- Primero verificar si ya está en orders
        SELECT COUNT(*) INTO v_count
        FROM orders
        WHERE id = v_order_id;
        
        IF v_count = 0 THEN
            -- Insertar la orden en orders (sin archived_at)
            INSERT INTO orders (
                id,
                restaurant_id,
                table_id,
                status,
                total_amount,
                created_at,
                waiter_id,
                guest_name,
                guest_count,
                has_updates
            )
            SELECT 
                id,
                restaurant_id,
                table_id,
                status,
                total_amount,
                created_at,
                waiter_id,
                guest_name,
                guest_count,
                has_updates
            FROM orders_archive
            WHERE id = v_order_id;
            
            RAISE NOTICE '✅ Orden movida temporalmente a orders';
        ELSE
            RAISE NOTICE '⚠️ Orden ya existe en orders';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR al mover orden:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
            RETURN;
    END;
    RAISE NOTICE '';
    
    -- PASO 2: Mover el batch a order_batches
    RAISE NOTICE 'PASO 2: Moviendo batch a order_batches...';
    
    BEGIN
        INSERT INTO order_batches (
            id,
            order_id,
            batch_number,
            status,
            created_at,
            served_at
        )
        SELECT 
            id,
            order_id,
            batch_number,
            status,
            created_at,
            served_at
        FROM order_batches_archive
        WHERE id = v_batch_id
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ Batch movido a order_batches (% filas)', v_count;
        ELSE
            RAISE NOTICE '⚠️ Batch ya existe en order_batches o no se pudo insertar';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR al mover batch:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
            -- Continuar para eliminar de archive
    END;
    RAISE NOTICE '';
    
    -- PASO 3: Mover items del batch
    RAISE NOTICE 'PASO 3: Moviendo items del batch...';
    
    BEGIN
        INSERT INTO order_items (
            id,
            batch_id,
            menu_item_id,
            quantity,
            price,
            status,
            created_at
        )
        SELECT 
            id,
            batch_id,
            menu_item_id,
            quantity,
            price,
            status,
            created_at
        FROM order_items_archive
        WHERE batch_id = v_batch_id
        ON CONFLICT (id) DO NOTHING;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ Items movidos a order_items (% filas)', v_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error al mover items: %', SQLERRM;
    END;
    RAISE NOTICE '';
    
    -- PASO 4: Eliminar batch e items de archive
    RAISE NOTICE 'PASO 4: Eliminando batch e items de archive...';
    
    BEGIN
        DELETE FROM order_items_archive
        WHERE batch_id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '   Items eliminados de archive: %', v_count;
        
        DELETE FROM order_batches_archive
        WHERE id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '   Batch eliminado de archive: %', v_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Error al eliminar de archive: %', SQLERRM;
    END;
    RAISE NOTICE '';
    
    -- PASO 5: IMPORTANTE - La orden ahora está en orders Y orders_archive
    -- Esto es temporal y esperado. La orden permanecerá en orders mientras tenga batches CREADO
    RAISE NOTICE 'PASO 5: Estado final';
    RAISE NOTICE '   La orden está ahora en ORDERS (necesario para el batch CREADO)';
    RAISE NOTICE '   La orden también sigue en ORDERS_ARCHIVE (para mantener historial)';
    RAISE NOTICE '   Cuando el batch cambie de status CREADO, puede re-archivarse la orden';
    RAISE NOTICE '';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROCESO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificación final
SELECT 
    'ORDEN EN ORDERS' as tipo,
    COUNT(*) as cantidad
FROM orders
WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';

SELECT 
    'BATCH EN ORDER_BATCHES' as tipo,
    COUNT(*) as cantidad
FROM order_batches
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'BATCH EN ORDER_BATCHES_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';
