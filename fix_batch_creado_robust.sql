-- Script robusto para mover el batch con status CREADO de vuelta a order_batches

DO $$
DECLARE
    v_batch_id uuid := '40d8624b-0684-449a-86ef-41e20fb7fee3';
    v_order_id uuid;
    v_count integer;
    v_error_text text;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MOVIENDO BATCH CREADO DE VUELTA A TABLA ACTIVA';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Paso 1: Verificar que el batch existe en order_batches_archive
    RAISE NOTICE 'PASO 1: Verificando batch en order_batches_archive...';
    SELECT order_id INTO v_order_id
    FROM order_batches_archive ob
    WHERE ob.id = v_batch_id
    AND ob.status = 'CREADO';
    
    IF v_order_id IS NULL THEN
        RAISE NOTICE '❌ Batch no encontrado en order_batches_archive con status CREADO';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Batch encontrado';
    RAISE NOTICE '   Batch ID: %', v_batch_id;
    RAISE NOTICE '   Order ID: %', v_order_id;
    RAISE NOTICE '';
    
    -- Paso 2: Verificar si ya existe en order_batches
    RAISE NOTICE 'PASO 2: Verificando si ya existe en order_batches...';
    SELECT COUNT(*) INTO v_count
    FROM order_batches ob
    WHERE ob.id = v_batch_id;
    
    IF v_count > 0 THEN
        RAISE NOTICE '⚠️ Batch ya existe en order_batches';
        RAISE NOTICE '   Eliminando de order_batches_archive de todas formas...';
        DELETE FROM order_batches_archive ob WHERE ob.id = v_batch_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '   Filas eliminadas de archive: %', v_count;
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Batch no existe en order_batches, procediendo...';
    RAISE NOTICE '';
    
    -- Paso 3: Obtener todos los datos del batch
    RAISE NOTICE 'PASO 3: Obteniendo datos del batch...';
    
    -- Paso 4: Insertar en order_batches
    RAISE NOTICE 'PASO 4: Insertando en order_batches...';
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
            ob.id,
            ob.order_id,
            ob.batch_number,
            ob.status,
            ob.created_at,
            ob.served_at
        FROM order_batches_archive ob
        WHERE ob.id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count = 0 THEN
            RAISE NOTICE '❌ No se insertó ninguna fila. Verificando estructura...';
            -- Verificar qué columnas tiene order_batches_archive
            RAISE NOTICE '   Columnas en order_batches_archive:';
            FOR v_error_text IN 
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'order_batches_archive' 
                ORDER BY ordinal_position
            LOOP
                RAISE NOTICE '     - %', v_error_text;
            END LOOP;
            RETURN;
        END IF;
        
        RAISE NOTICE '✅ Batch insertado en order_batches (% filas)', v_count;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR al insertar batch:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
            RETURN;
    END;
    RAISE NOTICE '';
    
    -- Paso 5: Mover items
    RAISE NOTICE 'PASO 5: Moviendo items...';
    SELECT COUNT(*) INTO v_count
    FROM order_items_archive oi
    WHERE oi.batch_id = v_batch_id;
    
    RAISE NOTICE '   Items encontrados en archive: %', v_count;
    
    IF v_count > 0 THEN
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
            RAISE NOTICE '✅ % items insertados en order_items', v_count;
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ ERROR al insertar items:';
                RAISE NOTICE '   Código: %', SQLSTATE;
                RAISE NOTICE '   Mensaje: %', SQLERRM;
        END;
    END IF;
    RAISE NOTICE '';
    
    -- Paso 6: Eliminar de tablas archivadas
    RAISE NOTICE 'PASO 6: Eliminando de tablas archivadas...';
    
    BEGIN
        DELETE FROM order_items_archive oi
        WHERE oi.batch_id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '   Items eliminados de archive: %', v_count;
        
        DELETE FROM order_batches_archive ob
        WHERE ob.id = v_batch_id;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count = 0 THEN
            RAISE NOTICE '⚠️ No se eliminó ninguna fila de order_batches_archive';
            RAISE NOTICE '   Puede ser un problema de permisos RLS';
        ELSE
            RAISE NOTICE '✅ Batch eliminado de order_batches_archive (% filas)', v_count;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ ERROR al eliminar de archive:';
            RAISE NOTICE '   Código: %', SQLSTATE;
            RAISE NOTICE '   Mensaje: %', SQLERRM;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROCESO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado final
SELECT 
    'EN ORDER_BATCHES' as tabla,
    COUNT(*) as cantidad,
    STRING_AGG(id::text, ', ') as batch_ids
FROM order_batches
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'EN ORDER_BATCHES_ARCHIVE' as tabla,
    COUNT(*) as cantidad,
    STRING_AGG(id::text, ', ') as batch_ids
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'ITEMS EN ORDER_ITEMS' as tabla,
    COUNT(*) as cantidad
FROM order_items
WHERE batch_id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

SELECT 
    'ITEMS EN ORDER_ITEMS_ARCHIVE' as tabla,
    COUNT(*) as cantidad
FROM order_items_archive
WHERE batch_id = '40d8624b-0684-449a-86ef-41e20fb7fee3';
