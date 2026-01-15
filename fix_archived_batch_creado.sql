-- Script para mover el batch con status CREADO de vuelta a order_batches

DO $$
DECLARE
    v_batch_id uuid := '40d8624b-0684-449a-86ef-41e20fb7fee3';
    v_order_id uuid;
    v_count integer;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MOVIENDO BATCH CREADO DE VUELTA A TABLA ACTIVA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Verificar que el batch existe en order_batches_archive y obtener order_id
    SELECT order_id INTO v_order_id
    FROM order_batches_archive ob
    WHERE ob.id = v_batch_id
    AND ob.status = 'CREADO';
    
    IF v_order_id IS NULL THEN
        RAISE NOTICE '❌ Batch no encontrado en order_batches_archive con status CREADO';
        RETURN;
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM order_batches_archive ob
    WHERE ob.id = v_batch_id
    AND ob.status = 'CREADO';
    
    RAISE NOTICE '✅ Batch encontrado';
    RAISE NOTICE '   Batch ID: %', v_batch_id;
    RAISE NOTICE '   Order ID: %', v_order_id;
    RAISE NOTICE '';
    
    -- Verificar si ya existe en order_batches
    SELECT COUNT(*) INTO v_count
    FROM order_batches ob
    WHERE ob.id = v_batch_id;
    
    IF v_count > 0 THEN
        RAISE NOTICE '⚠️ Batch ya existe en order_batches';
        RETURN;
    END IF;
    
    -- Mover el batch de vuelta a order_batches (sin archived_at)
    RAISE NOTICE 'Moviendo batch a order_batches...';
    BEGIN
        -- Primero verificar qué columnas tiene order_batches_archive
        RAISE NOTICE 'Verificando estructura del batch...';
        
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
        FROM order_batches_archive ob
        WHERE ob.id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ Batch movido a order_batches (% filas)', v_count;
        ELSE
            RAISE NOTICE '⚠️ No se insertó ninguna fila en order_batches';
        END IF;
        
        -- Mover los items del batch también
        RAISE NOTICE 'Moviendo items del batch...';
        SELECT COUNT(*) INTO v_count
        FROM order_items_archive oi
        WHERE oi.batch_id = v_batch_id;
        
        RAISE NOTICE '   Items encontrados en archive: %', v_count;
        
        IF v_count > 0 THEN
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
                oi.id,
                oi.batch_id,
                oi.menu_item_id,
                oi.quantity,
                oi.price,
                oi.status,
                oi.created_at
            FROM order_items_archive oi
            WHERE oi.batch_id = v_batch_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE '✅ % items movidos a order_items', v_count;
        ELSE
            RAISE NOTICE '⚠️ No hay items para mover';
        END IF;
        
        -- Eliminar de tablas archivadas (primero items, luego batch)
        RAISE NOTICE 'Eliminando de tablas archivadas...';
        
        DELETE FROM order_items_archive oi
        WHERE oi.batch_id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '   Items eliminados de archive: %', v_count;
        
        DELETE FROM order_batches_archive ob
        WHERE ob.id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ Batch eliminado de order_batches_archive (% filas)', v_count;
        ELSE
            RAISE NOTICE '⚠️ No se eliminó ninguna fila de order_batches_archive';
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
            RAISE NOTICE '   Detalle: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROCESO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN EN ORDER_BATCHES' as tipo,
    COUNT(*) as cantidad
FROM order_batches
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'VERIFICACIÓN EN ORDER_BATCHES_ARCHIVE' as tipo,
    COUNT(*) as cantidad
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';
