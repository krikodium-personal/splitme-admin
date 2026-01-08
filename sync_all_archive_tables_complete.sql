-- ============================================
-- Script completo para sincronizar TODAS las tablas _archive
-- ============================================
-- Este script agrega automáticamente todas las columnas faltantes
-- para que las tablas _archive sean idénticas a las originales
-- ============================================

-- ============================================
-- 1. Sincronizar orders_archive con orders
-- ============================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'orders'
          AND column_name != 'archived_at'
          AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns a
            WHERE a.table_schema = 'public'
              AND a.table_name = 'orders_archive'
              AND a.column_name = information_schema.columns.column_name
          )
    LOOP
        EXECUTE format(
            'ALTER TABLE orders_archive ADD COLUMN IF NOT EXISTS %I %s%s%s',
            col_record.column_name,
            col_record.data_type,
            CASE WHEN col_record.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
            CASE WHEN col_record.column_default IS NOT NULL 
                 THEN ' DEFAULT ' || col_record.column_default 
                 ELSE '' END
        );
    END LOOP;
END $$;

-- ============================================
-- 2. Sincronizar order_batches_archive con order_batches
-- ============================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'order_batches'
          AND column_name != 'archived_at'
          AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns a
            WHERE a.table_schema = 'public'
              AND a.table_name = 'order_batches_archive'
              AND a.column_name = information_schema.columns.column_name
          )
    LOOP
        EXECUTE format(
            'ALTER TABLE order_batches_archive ADD COLUMN IF NOT EXISTS %I %s%s%s',
            col_record.column_name,
            col_record.data_type,
            CASE WHEN col_record.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
            CASE WHEN col_record.column_default IS NOT NULL 
                 THEN ' DEFAULT ' || col_record.column_default 
                 ELSE '' END
        );
    END LOOP;
END $$;

-- ============================================
-- 3. Sincronizar order_items_archive con order_items
-- ============================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'order_items'
          AND column_name != 'archived_at'
          AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns a
            WHERE a.table_schema = 'public'
              AND a.table_name = 'order_items_archive'
              AND a.column_name = information_schema.columns.column_name
          )
    LOOP
        EXECUTE format(
            'ALTER TABLE order_items_archive ADD COLUMN IF NOT EXISTS %I %s%s%s',
            col_record.column_name,
            col_record.data_type,
            CASE WHEN col_record.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
            CASE WHEN col_record.column_default IS NOT NULL 
                 THEN ' DEFAULT ' || col_record.column_default 
                 ELSE '' END
        );
    END LOOP;
END $$;

-- ============================================
-- 4. Sincronizar order_guests_archive con order_guests
-- ============================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'order_guests'
          AND column_name != 'archived_at'
          AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns a
            WHERE a.table_schema = 'public'
              AND a.table_name = 'order_guests_archive'
              AND a.column_name = information_schema.columns.column_name
          )
    LOOP
        EXECUTE format(
            'ALTER TABLE order_guests_archive ADD COLUMN IF NOT EXISTS %I %s%s%s',
            col_record.column_name,
            col_record.data_type,
            CASE WHEN col_record.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
            CASE WHEN col_record.column_default IS NOT NULL 
                 THEN ' DEFAULT ' || col_record.column_default 
                 ELSE '' END
        );
    END LOOP;
END $$;

-- ============================================
-- 5. Sincronizar payments_archive con payments (si existe)
-- ============================================
DO $$
DECLARE
    col_record RECORD;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'payments') THEN
        FOR col_record IN 
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND table_name = 'payments'
              AND column_name != 'archived_at'
              AND NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns a
                WHERE a.table_schema = 'public'
                  AND a.table_name = 'payments_archive'
                  AND a.column_name = information_schema.columns.column_name
              )
        LOOP
            EXECUTE format(
                'ALTER TABLE payments_archive ADD COLUMN IF NOT EXISTS %I %s%s%s',
                col_record.column_name,
                col_record.data_type,
                CASE WHEN col_record.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
                CASE WHEN col_record.column_default IS NOT NULL 
                     THEN ' DEFAULT ' || col_record.column_default 
                     ELSE '' END
            );
        END LOOP;
    END IF;
END $$;

-- ============================================
-- 6. Verificar que todas las tablas están sincronizadas
-- ============================================
SELECT 
    'orders' as tabla_original,
    'orders_archive' as tabla_archive,
    COUNT(*) as columnas_faltantes
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
    COUNT(*) as columnas_faltantes
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
    COUNT(*) as columnas_faltantes
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
    COUNT(*) as columnas_faltantes
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
  );

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Este script sincroniza automáticamente todas las tablas _archive
-- 2. Usa bloques DO para ejecutar ALTER TABLE dinámicamente
-- 3. La sección 6 verifica que no queden columnas faltantes
-- 4. Si todas las tablas están sincronizadas, la sección 6 mostrará 0 en todas
-- 5. Ejecuta este script cada vez que agregues columnas a las tablas originales
-- ============================================

