-- ============================================
-- Script para sincronizar order_items_archive con order_items
-- ============================================

-- ============================================
-- 1. Ver columnas de order_items
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
-- 2. Ver columnas de order_items_archive
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
-- 3. Identificar columnas faltantes en order_items_archive
-- ============================================
SELECT 
    o.column_name,
    o.data_type,
    o.is_nullable,
    o.column_default
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
-- 4. Generar comandos ALTER TABLE para agregar columnas faltantes
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

