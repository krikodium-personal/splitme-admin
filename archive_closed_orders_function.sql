-- ============================================
-- Fix robusto para archivado de ordenes cerradas
-- ============================================
-- Ejecutar completo en Supabase SQL Editor.
--
-- Corrige el error:
--   column "archived_at" is of type timestamp with time zone but expression is of type jsonb
--
-- Causa: las funciones anteriores copiaban filas con INSERT ... SELECT *.
-- Cuando las tablas *_archive tienen columnas extra o en distinto orden, Postgres
-- intenta insertar valores por posicion y puede terminar poniendo una columna jsonb
-- en archived_at. Esta version copia siempre por nombre de columna.
-- ============================================

-- 1) Crear tablas archive si no existen.
CREATE TABLE IF NOT EXISTS orders_archive (LIKE orders INCLUDING ALL);
CREATE TABLE IF NOT EXISTS order_batches_archive (LIKE order_batches INCLUDING ALL);
CREATE TABLE IF NOT EXISTS order_items_archive (LIKE order_items INCLUDING ALL);
CREATE TABLE IF NOT EXISTS order_guests_archive (LIKE order_guests INCLUDING ALL);
CREATE TABLE IF NOT EXISTS payments_archive (LIKE payments INCLUDING ALL);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_guest_charges'
  ) THEN
    CREATE TABLE IF NOT EXISTS order_guest_charges_archive (LIKE order_guest_charges INCLUDING ALL);
  END IF;
END $$;

-- 2) Helper: sincroniza columnas de la tabla activa hacia la tabla archive.
CREATE OR REPLACE FUNCTION public.archive_sync_table(p_source_table text, p_archive_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_column record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_source_table
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_archive_table
  ) THEN
    RETURN;
  END IF;

  FOR v_column IN
    SELECT
      src.attname AS column_name,
      format_type(src.atttypid, src.atttypmod) AS column_type
    FROM pg_attribute src
    JOIN pg_class src_class ON src_class.oid = src.attrelid
    JOIN pg_namespace src_ns ON src_ns.oid = src_class.relnamespace
    WHERE src_ns.nspname = 'public'
      AND src_class.relname = p_source_table
      AND src.attnum > 0
      AND NOT src.attisdropped
      AND src.attname <> 'archived_at'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_attribute dst
        JOIN pg_class dst_class ON dst_class.oid = dst.attrelid
        JOIN pg_namespace dst_ns ON dst_ns.oid = dst_class.relnamespace
        WHERE dst_ns.nspname = 'public'
          AND dst_class.relname = p_archive_table
          AND dst.attnum > 0
          AND NOT dst.attisdropped
          AND dst.attname = src.attname
      )
    ORDER BY src.attnum
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS %I %s',
      p_archive_table,
      v_column.column_name,
      v_column.column_type
    );
  END LOOP;

  EXECUTE format(
    'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT now()',
    p_archive_table
  );
END;
$$;

SELECT public.archive_sync_table('orders', 'orders_archive');
SELECT public.archive_sync_table('order_batches', 'order_batches_archive');
SELECT public.archive_sync_table('order_items', 'order_items_archive');
SELECT public.archive_sync_table('order_guests', 'order_guests_archive');
SELECT public.archive_sync_table('payments', 'payments_archive');
SELECT public.archive_sync_table('order_guest_charges', 'order_guest_charges_archive');

-- 3) Indices utiles.
CREATE INDEX IF NOT EXISTS idx_orders_archive_restaurant_id ON orders_archive(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_archive_created_at ON orders_archive(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_archive_archived_at ON orders_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_order_batches_archive_order_id ON order_batches_archive(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_archive_batch_id ON order_items_archive(batch_id);
CREATE INDEX IF NOT EXISTS idx_order_items_archive_order_id ON order_items_archive(order_id);
CREATE INDEX IF NOT EXISTS idx_order_guests_archive_order_id ON order_guests_archive(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_archive_order_id ON payments_archive(order_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_guest_charges_archive'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_order_guest_charges_archive_order_id ON order_guest_charges_archive(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_guest_charges_archive_guest_id ON order_guest_charges_archive(guest_id);
  END IF;
END $$;

-- 4) Helper: copia filas usando solo columnas comunes y agrega archived_at explicitamente.
CREATE OR REPLACE FUNCTION public.archive_insert_matching_columns(
  p_source_table text,
  p_archive_table text,
  p_where_sql text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_columns text;
  v_rows integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_source_table
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_archive_table
  ) THEN
    RETURN 0;
  END IF;

  SELECT string_agg(format('%I', src.column_name), ', ' ORDER BY src.ordinal_position)
  INTO v_columns
  FROM information_schema.columns src
  JOIN information_schema.columns dst
    ON dst.table_schema = 'public'
   AND dst.table_name = p_archive_table
   AND dst.column_name = src.column_name
  WHERE src.table_schema = 'public'
    AND src.table_name = p_source_table
    AND src.column_name <> 'archived_at';

  IF v_columns IS NULL OR v_columns = '' THEN
    RETURN 0;
  END IF;

  EXECUTE format(
    'INSERT INTO public.%I (%s, archived_at)
     SELECT %s, now()
     FROM public.%I
     WHERE %s
     ON CONFLICT DO NOTHING',
    p_archive_table,
    v_columns,
    v_columns,
    p_source_table,
    p_where_sql
  );

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

-- 5) Archiva una orden completa. Mantiene nombres de parametros esperados por el frontend:
--    supabase.rpc('archive_order', { order_id, restaurant_id_param })
DROP FUNCTION IF EXISTS public.archive_order(uuid, uuid);

CREATE FUNCTION public.archive_order(order_id uuid, restaurant_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_archived_records integer := 0;
  v_status text;
  v_order_id uuid := $1;
  v_restaurant_id uuid := $2;
BEGIN
  SELECT o.status
  INTO v_status
  FROM public.orders o
  WHERE o.id = v_order_id
    AND o.restaurant_id = v_restaurant_id;

  IF v_status IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Orden no encontrada o no pertenece al restaurante'
    );
  END IF;

  IF v_status NOT IN ('CERRADO', 'Pagado') THEN
    RETURN json_build_object(
      'success', false,
      'error', format('La orden debe estar CERRADO o Pagado para archivarse. Status actual: %s', v_status)
    );
  END IF;

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'orders',
    'orders_archive',
    format('id = %L AND restaurant_id = %L', v_order_id, v_restaurant_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'order_batches',
    'order_batches_archive',
    format('order_id = %L', v_order_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'order_items',
    'order_items_archive',
    format('batch_id IN (SELECT id FROM public.order_batches WHERE order_id = %L)', v_order_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'order_guests',
    'order_guests_archive',
    format('order_id = %L', v_order_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'order_guest_charges',
    'order_guest_charges_archive',
    format('order_id = %L', v_order_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'payments',
    'payments_archive',
    format('order_id = %L', v_order_id)
  );

  -- Borrar activas en orden de dependencias. Todas las copias ya quedaron hechas.
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'order_guest_charges'
  ) THEN
    DELETE FROM public.order_guest_charges ogc WHERE ogc.order_id = v_order_id;
  END IF;

  DELETE FROM public.order_items oi
  WHERE oi.batch_id IN (
    SELECT ob.id FROM public.order_batches ob WHERE ob.order_id = v_order_id
  );

  DELETE FROM public.payments p WHERE p.order_id = v_order_id;
  DELETE FROM public.order_guests og WHERE og.order_id = v_order_id;
  DELETE FROM public.order_batches ob WHERE ob.order_id = v_order_id;
  DELETE FROM public.orders o WHERE o.id = v_order_id AND o.restaurant_id = v_restaurant_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'archived_records', v_archived_records,
    'archived_at', now()
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'order_id', v_order_id,
      'error', SQLERRM
    );
END;
$$;

-- 6) Archiva todas las ordenes cerradas de un restaurante. Nombre y parametro esperados por el boton:
--    supabase.rpc('archive_closed_orders', { p_restaurant_id })
DROP FUNCTION IF EXISTS public.archive_closed_orders(uuid);

CREATE FUNCTION public.archive_closed_orders(p_restaurant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_result json;
  v_archived_orders integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  FOR v_order IN
    SELECT o.id
    FROM public.orders o
    WHERE o.restaurant_id = p_restaurant_id
      AND o.status IN ('CERRADO', 'Pagado')
    ORDER BY o.created_at ASC
  LOOP
    v_result := public.archive_order(v_order.id, p_restaurant_id);

    IF COALESCE((v_result->>'success')::boolean, false) THEN
      v_archived_orders := v_archived_orders + 1;
    ELSE
      v_errors := v_errors || jsonb_build_array(
        jsonb_build_object(
          'order_id', v_order.id,
          'error', v_result->>'error'
        )
      );
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', jsonb_array_length(v_errors) = 0,
    'archived_orders', v_archived_orders,
    'errors', v_errors,
    'archived_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.archive_insert_matching_columns(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_sync_table(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.archive_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_closed_orders(uuid) TO authenticated;

COMMENT ON FUNCTION public.archive_order(uuid, uuid)
IS 'Archiva una orden CERRADO/Pagado copiando por nombre de columna hacia tablas *_archive.';

COMMENT ON FUNCTION public.archive_closed_orders(uuid)
IS 'Archiva todas las ordenes CERRADO/Pagado de un restaurante. Usada por el boton ARCHIVAR ORDENES CERRADAS.';

CREATE OR REPLACE FUNCTION public.archive_functions_version()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'archive_closed_orders_function_2026_06_06_column_safe_v2';
$$;

GRANT EXECUTE ON FUNCTION public.archive_functions_version() TO authenticated;

-- Forzar a PostgREST/Supabase a recargar el schema cache de las RPC.
NOTIFY pgrst, 'reload schema';
