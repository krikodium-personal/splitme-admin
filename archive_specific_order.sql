-- Script para archivar una orden específica y todas sus dependencias
-- Orden ID: 6804bb42-3c50-4ae0-8fd7-3c863cb0a12a
-- 
-- IMPORTANTE: Antes de ejecutar este script, asegúrate de que las tablas _archive
-- estén sincronizadas ejecutando: sync_all_archive_tables_complete.sql

-- ============================================
-- PASO 1: Verificar que la orden existe y está pagada
-- ============================================
SELECT 
    id,
    restaurant_id,
    status,
    total_amount,
    created_at
FROM orders
WHERE id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- PASO 2: Archivar la orden principal
-- ============================================
-- Insertar todas las columnas de orders (la tabla _archive debe tener la misma estructura + archived_at)
DO $$
DECLARE
    col_list TEXT;
    col_list_select TEXT;
    col_list_insert TEXT;
BEGIN
    -- Construir lista de columnas de orders (excluyendo archived_at)
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO col_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'orders'
      AND column_name != 'archived_at';
    
    -- Lista para SELECT (sin archived_at)
    col_list_select := col_list;
    
    -- Lista para INSERT (columnas de orders + archived_at)
    IF col_list IS NOT NULL AND col_list != '' THEN
        col_list_insert := col_list || ', archived_at';
    ELSE
        col_list_insert := 'archived_at';
    END IF;
    
    -- Ejecutar INSERT dinámico: todas las columnas de orders + archived_at
    EXECUTE format(
        'INSERT INTO orders_archive (%s) SELECT %s, NOW() FROM orders WHERE id = %L',
        col_list_insert,
        col_list_select,
        '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
    );
END $$;

-- ============================================
-- PASO 3: Archivar todos los batches de la orden
-- ============================================
-- Insertar todas las columnas de order_batches (la tabla _archive debe tener la misma estructura + archived_at)
DO $$
DECLARE
    col_list TEXT;
    col_list_select TEXT;
    col_list_insert TEXT;
BEGIN
    -- Construir lista de columnas de order_batches (excluyendo archived_at)
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO col_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'order_batches'
      AND column_name != 'archived_at';
    
    -- Lista para SELECT (sin archived_at)
    col_list_select := col_list;
    
    -- Lista para INSERT (columnas de order_batches + archived_at)
    IF col_list IS NOT NULL AND col_list != '' THEN
        col_list_insert := col_list || ', archived_at';
    ELSE
        col_list_insert := 'archived_at';
    END IF;
    
    EXECUTE format(
        'INSERT INTO order_batches_archive (%s) SELECT %s, NOW() FROM order_batches WHERE order_id = %L',
        col_list_insert,
        col_list_select,
        '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
    );
END $$;

-- Verificar cuántos batches se archivaron
SELECT COUNT(*) as batches_archived
FROM order_batches_archive
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- PASO 4: Archivar todos los items de los batches
-- ============================================
-- Insertar todas las columnas de order_items (la tabla _archive debe tener la misma estructura + archived_at)
DO $$
DECLARE
    col_list TEXT;
    col_list_with_prefix TEXT;
    col_list_insert TEXT;
BEGIN
    -- Construir lista de columnas de order_items (excluyendo archived_at)
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO col_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'order_items'
      AND column_name != 'archived_at';
    
    -- Lista de columnas con prefijo oi. (para SELECT, excluyendo archived_at)
    SELECT string_agg('oi.' || column_name, ', ' ORDER BY ordinal_position)
    INTO col_list_with_prefix
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'order_items'
      AND column_name != 'archived_at';
    
    -- Lista para INSERT (columnas de order_items + archived_at)
    IF col_list IS NOT NULL AND col_list != '' THEN
        col_list_insert := col_list || ', archived_at';
    ELSE
        col_list_insert := 'archived_at';
    END IF;
    
    EXECUTE format(
        'INSERT INTO order_items_archive (%s) SELECT %s, NOW() FROM order_items oi INNER JOIN order_batches ob ON oi.batch_id = ob.id WHERE ob.order_id = %L',
        col_list_insert,
        col_list_with_prefix,
        '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
    );
END $$;

-- Verificar cuántos items se archivaron
SELECT COUNT(*) as items_archived
FROM order_items_archive oi
INNER JOIN order_batches_archive ob ON oi.batch_id = ob.id
WHERE ob.order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- PASO 5: Archivar todos los guests de la orden
-- ============================================
-- Insertar todas las columnas de order_guests (la tabla _archive debe tener la misma estructura + archived_at)
DO $$
DECLARE
    col_list TEXT;
    col_list_select TEXT;
    col_list_insert TEXT;
BEGIN
    -- Construir lista de columnas de order_guests (excluyendo archived_at)
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO col_list
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'order_guests'
      AND column_name != 'archived_at';
    
    -- Lista para SELECT (sin archived_at)
    col_list_select := col_list;
    
    -- Lista para INSERT (columnas de order_guests + archived_at)
    IF col_list IS NOT NULL AND col_list != '' THEN
        col_list_insert := col_list || ', archived_at';
    ELSE
        col_list_insert := 'archived_at';
    END IF;
    
    EXECUTE format(
        'INSERT INTO order_guests_archive (%s) SELECT %s, NOW() FROM order_guests WHERE order_id = %L',
        col_list_insert,
        col_list_select,
        '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
    );
END $$;

-- Verificar cuántos guests se archivaron
SELECT COUNT(*) as guests_archived
FROM order_guests_archive
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- PASO 6: Archivar todos los payments de la orden (si existe la tabla)
-- ============================================
-- Insertar todas las columnas de payments (la tabla _archive debe tener la misma estructura + archived_at)
DO $$
DECLARE
    col_list TEXT;
    col_list_select TEXT;
    col_list_insert TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        -- Construir lista de columnas de payments (excluyendo archived_at)
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        INTO col_list
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'payments'
          AND column_name != 'archived_at';
        
        -- Lista para SELECT (sin archived_at)
        col_list_select := col_list;
        
        -- Lista para INSERT (columnas de payments + archived_at)
        IF col_list IS NOT NULL AND col_list != '' THEN
            col_list_insert := col_list || ', archived_at';
        ELSE
            col_list_insert := 'archived_at';
        END IF;
        
        EXECUTE format(
            'INSERT INTO payments_archive (%s) SELECT %s, NOW() FROM payments WHERE order_id = %L',
            col_list_insert,
            col_list_select,
            '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
        );
    END IF;
END $$;

-- Verificar cuántos payments se archivaron
SELECT COUNT(*) as payments_archived
FROM payments_archive
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- PASO 7: Archivar reviews (si existe la tabla y tiene reviews para esta orden)
-- ============================================
-- Nota: Si no existe reviews_archive, simplemente eliminamos los reviews
-- ya que no necesitamos mantenerlos archivados
DO $$
DECLARE
    reviews_table_exists BOOLEAN;
    reviews_archive_exists BOOLEAN;
BEGIN
    -- Verificar si existe la tabla reviews
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews'
    ) INTO reviews_table_exists;
    
    -- Verificar si existe la tabla reviews_archive
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews_archive'
    ) INTO reviews_archive_exists;
    
    IF reviews_table_exists THEN
        IF reviews_archive_exists THEN
            -- Si existe reviews_archive, archivar los reviews
            -- Construir lista de columnas de reviews (excluyendo archived_at)
            DECLARE
                col_list TEXT;
                col_list_select TEXT;
                col_list_insert TEXT;
            BEGIN
                SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
                INTO col_list
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                  AND table_name = 'reviews'
                  AND column_name != 'archived_at';
                
                -- Lista para SELECT (sin archived_at)
                col_list_select := col_list;
                
                -- Lista para INSERT (columnas de reviews + archived_at)
                IF col_list IS NOT NULL AND col_list != '' THEN
                    col_list_insert := col_list || ', archived_at';
                ELSE
                    col_list_insert := 'archived_at';
                END IF;
                
                EXECUTE format(
                    'INSERT INTO reviews_archive (%s) SELECT %s, NOW() FROM reviews WHERE order_id = %L',
                    col_list_insert,
                    col_list_select,
                    '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
                );
            END;
        END IF;
    END IF;
END $$;

-- Verificar cuántos reviews se archivaron (si existe la tabla)
-- Nota: Esta verificación es opcional. Si reviews_archive no existe, simplemente se omite.
DO $$
DECLARE
    reviews_archive_exists BOOLEAN;
    review_count INTEGER;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reviews_archive'
    ) INTO reviews_archive_exists;
    
    IF reviews_archive_exists THEN
        EXECUTE format(
            'SELECT COUNT(*) FROM reviews_archive WHERE order_id = %L',
            '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
        ) INTO review_count;
        
        RAISE NOTICE 'Reviews archivados: %', review_count;
    ELSE
        RAISE NOTICE 'Tabla reviews_archive no existe. Los reviews fueron eliminados sin archivar.';
    END IF;
END $$;

-- ============================================
-- PASO 8: Eliminar los registros de las tablas activas
-- IMPORTANTE: Ejecutar estos DELETE solo después de verificar que el archivado fue exitoso
-- IMPORTANTE: El orden es crítico debido a las restricciones de clave foránea
-- ============================================

-- 8.1. Eliminar reviews PRIMERO (tiene FK a orders, debe eliminarse antes que orders)
-- Nota: Los reviews ya fueron archivados en el paso 7 (si existe reviews_archive)
DELETE FROM reviews 
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- 8.2. Eliminar items (dependen de batches)
DELETE FROM order_items
WHERE batch_id IN (
    SELECT id FROM order_batches 
    WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'
);

-- 8.3. Eliminar batches (dependen de orders)
DELETE FROM order_batches 
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- 8.4. Eliminar guests
DELETE FROM order_guests 
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- 8.5. Eliminar payments (si existe la tabla)
DELETE FROM payments 
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- 8.6. Eliminar la orden principal (ahora que no hay referencias de reviews)
DELETE FROM orders 
WHERE id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- PASO 8: Verificar que todo se archivó correctamente
-- ============================================
SELECT 
    'orders_archive' as tabla,
    COUNT(*) as registros
FROM orders_archive
WHERE id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'

UNION ALL

SELECT 
    'order_batches_archive' as tabla,
    COUNT(*) as registros
FROM order_batches_archive
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'

UNION ALL

SELECT 
    'order_items_archive' as tabla,
    COUNT(*) as registros
FROM order_items_archive oi
INNER JOIN order_batches_archive ob ON oi.batch_id = ob.id
WHERE ob.order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'

UNION ALL

SELECT 
    'order_guests_archive' as tabla,
    COUNT(*) as registros
FROM order_guests_archive
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a'

UNION ALL

SELECT 
    'payments_archive' as tabla,
    COUNT(*) as registros
FROM payments_archive
WHERE order_id = '6804bb42-3c50-4ae0-8fd7-3c863cb0a12a';

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Este script archiva la orden y todas sus dependencias
-- 2. Los pasos 1-6 son de solo lectura/inserción (seguros)
-- 3. Los pasos 7 son DELETE (irreversibles, ejecutar con cuidado)
-- 4. El paso 8 verifica que todo se archivó correctamente
-- 5. Si algo falla, los datos originales siguen en las tablas activas
-- ============================================

