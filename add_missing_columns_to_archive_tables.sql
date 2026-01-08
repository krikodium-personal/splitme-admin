-- ============================================
-- Script para agregar columnas faltantes a las tablas _archive
-- ============================================
-- Basado en el resultado del script sync_archive_tables_structure.sql
-- ============================================

-- ============================================
-- 1. Agregar columna served_at a order_batches_archive
-- ============================================
ALTER TABLE order_batches_archive 
ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- 2. Agregar columnas faltantes a order_guests_archive
-- ============================================

-- 2.1. Agregar columna paid (boolean NOT NULL)
ALTER TABLE order_guests_archive 
ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

-- 2.2. Agregar columna payment_id (uuid nullable)
ALTER TABLE order_guests_archive 
ADD COLUMN IF NOT EXISTS payment_id UUID;

-- 2.3. Agregar columna payment_method (varchar nullable)
ALTER TABLE order_guests_archive 
ADD COLUMN IF NOT EXISTS payment_method CHARACTER VARYING;

-- ============================================
-- 3. Agregar columna status a order_items_archive
-- ============================================
ALTER TABLE order_items_archive 
ADD COLUMN IF NOT EXISTS status CHARACTER VARYING;

-- ============================================
-- 4. Verificar que todas las columnas se agregaron correctamente
-- ============================================
SELECT 
    'order_batches_archive' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_batches_archive'
  AND column_name = 'served_at'

UNION ALL

SELECT 
    'order_guests_archive' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_guests_archive'
  AND column_name IN ('paid', 'payment_id', 'payment_method')

UNION ALL

SELECT 
    'order_items_archive' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'order_items_archive'
  AND column_name = 'status'

ORDER BY tabla, column_name;

-- ============================================
-- 5. Verificar que no queden columnas faltantes
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
-- 1. Este script agrega todas las columnas faltantes identificadas
-- 2. Usa IF NOT EXISTS para evitar errores si la columna ya existe
-- 3. La columna 'paid' tiene DEFAULT false para valores existentes
-- 4. Ejecuta la sección 5 para verificar que no queden columnas faltantes
-- 5. Si la sección 5 devuelve 0 filas, todas las columnas están sincronizadas
-- ============================================

