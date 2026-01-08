-- ============================================
-- Script para sincronizar estructuras de tablas _archive
-- ============================================
-- Este script muestra las columnas de las tablas order_* y sus correspondientes _archive
-- para identificar diferencias y sincronizarlas
-- ============================================

-- ============================================
-- 1. COLUMNAS DE orders
-- ============================================
SELECT 
    'orders' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- ============================================
-- 2. COLUMNAS DE orders_archive
-- ============================================
SELECT 
    'orders_archive' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders_archive'
ORDER BY ordinal_position;

-- ============================================
-- 3. COMPARACIÓN: Columnas en orders pero NO en orders_archive
-- ============================================
SELECT 
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'orders'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'orders_archive'
      AND a.column_name = o.column_name
  )
ORDER BY o.ordinal_position;

-- ============================================
-- 4. COLUMNAS DE order_batches
-- ============================================
SELECT 
    'order_batches' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_batches'
ORDER BY ordinal_position;

-- ============================================
-- 5. COLUMNAS DE order_batches_archive
-- ============================================
SELECT 
    'order_batches_archive' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_batches_archive'
ORDER BY ordinal_position;

-- ============================================
-- 6. COMPARACIÓN: Columnas en order_batches pero NO en order_batches_archive
-- ============================================
SELECT 
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'order_batches'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'order_batches_archive'
      AND a.column_name = o.column_name
  )
ORDER BY o.ordinal_position;

-- ============================================
-- 7. COLUMNAS DE order_items
-- ============================================
SELECT 
    'order_items' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items'
ORDER BY ordinal_position;

-- ============================================
-- 8. COLUMNAS DE order_items_archive
-- ============================================
SELECT 
    'order_items_archive' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items_archive'
ORDER BY ordinal_position;

-- ============================================
-- 9. COMPARACIÓN: Columnas en order_items pero NO en order_items_archive
-- ============================================
SELECT 
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'order_items'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'order_items_archive'
      AND a.column_name = o.column_name
  )
ORDER BY o.ordinal_position;

-- ============================================
-- 10. COLUMNAS DE order_guests
-- ============================================
SELECT 
    'order_guests' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_guests'
ORDER BY ordinal_position;

-- ============================================
-- 11. COLUMNAS DE order_guests_archive
-- ============================================
SELECT 
    'order_guests_archive' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_guests_archive'
ORDER BY ordinal_position;

-- ============================================
-- 12. COMPARACIÓN: Columnas en order_guests pero NO en order_guests_archive
-- ============================================
SELECT 
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'order_guests'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'order_guests_archive'
      AND a.column_name = o.column_name
  )
ORDER BY o.ordinal_position;

-- ============================================
-- 13. COLUMNAS DE payments (si existe)
-- ============================================
SELECT 
    'payments' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'payments'
ORDER BY ordinal_position;

-- ============================================
-- 14. COLUMNAS DE payments_archive (si existe)
-- ============================================
SELECT 
    'payments_archive' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'payments_archive'
ORDER BY ordinal_position;

-- ============================================
-- 15. RESUMEN: Todas las diferencias encontradas
-- ============================================
SELECT 
    'orders' as tabla_original,
    'orders_archive' as tabla_archive,
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'orders'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'orders_archive'
      AND a.column_name = o.column_name
  )

UNION ALL

SELECT 
    'order_batches' as tabla_original,
    'order_batches_archive' as tabla_archive,
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'order_batches'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'order_batches_archive'
      AND a.column_name = o.column_name
  )

UNION ALL

SELECT 
    'order_items' as tabla_original,
    'order_items_archive' as tabla_archive,
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'order_items'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'order_items_archive'
      AND a.column_name = o.column_name
  )

UNION ALL

SELECT 
    'order_guests' as tabla_original,
    'order_guests_archive' as tabla_archive,
    o.column_name,
    o.data_type,
    o.is_nullable
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'order_guests'
  AND o.column_name != 'archived_at'
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'order_guests_archive'
      AND a.column_name = o.column_name
  )

ORDER BY tabla_original, column_name;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Ejecuta este script para ver todas las columnas de cada tabla
-- 2. Revisa las comparaciones para identificar columnas faltantes
-- 3. Usa el resumen final (sección 15) para ver todas las diferencias
-- 4. Después de identificar las diferencias, ejecuta los comandos ALTER TABLE
--    necesarios para agregar las columnas faltantes a las tablas _archive
-- ============================================

