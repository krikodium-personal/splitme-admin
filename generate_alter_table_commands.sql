-- ============================================
-- Script para generar comandos ALTER TABLE automáticamente
-- ============================================
-- Este script genera los comandos ALTER TABLE necesarios para
-- agregar las columnas faltantes a las tablas _archive
-- ============================================

-- ============================================
-- GENERAR COMANDOS PARA orders_archive
-- ============================================
SELECT 
    'ALTER TABLE orders_archive ADD COLUMN IF NOT EXISTS ' || 
    column_name || ' ' || 
    data_type || 
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END || ';' as comando_alter
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
-- GENERAR COMANDOS PARA order_batches_archive
-- ============================================
SELECT 
    'ALTER TABLE order_batches_archive ADD COLUMN IF NOT EXISTS ' || 
    column_name || ' ' || 
    data_type || 
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END || ';' as comando_alter
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
-- GENERAR COMANDOS PARA order_items_archive
-- ============================================
SELECT 
    'ALTER TABLE order_items_archive ADD COLUMN IF NOT EXISTS ' || 
    column_name || ' ' || 
    data_type || 
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END || ';' as comando_alter
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
-- GENERAR COMANDOS PARA order_guests_archive
-- ============================================
SELECT 
    'ALTER TABLE order_guests_archive ADD COLUMN IF NOT EXISTS ' || 
    column_name || ' ' || 
    data_type || 
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END || ';' as comando_alter
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
-- GENERAR COMANDOS PARA payments_archive (si existe payments)
-- ============================================
SELECT 
    'ALTER TABLE payments_archive ADD COLUMN IF NOT EXISTS ' || 
    column_name || ' ' || 
    data_type || 
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END ||
    CASE 
        WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
        ELSE ''
    END || ';' as comando_alter
FROM information_schema.columns o
WHERE o.table_schema = 'public' 
  AND o.table_name = 'payments'
  AND o.column_name != 'archived_at'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments')
  AND NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns a
    WHERE a.table_schema = 'public'
      AND a.table_name = 'payments_archive'
      AND a.column_name = o.column_name
  )
ORDER BY o.ordinal_position;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Ejecuta este script para generar los comandos ALTER TABLE
-- 2. Copia los comandos generados y ejecútalos en el SQL Editor
-- 3. Los comandos usan "IF NOT EXISTS" para evitar errores si la columna ya existe
-- 4. Si hay columnas con valores por defecto complejos, puede que necesites ajustarlos manualmente
-- ============================================

