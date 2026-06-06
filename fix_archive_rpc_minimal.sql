-- ============================================
-- Fix minimo: reemplaza las RPC de archivado
-- ============================================
-- Ejecutar completo en Supabase SQL Editor con "Run without RLS".

CREATE OR REPLACE FUNCTION public.archive_insert_matching_columns(
  p_source_table text,
  p_archive_table text,
  p_where_sql text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_columns text;
  v_rows integer := 0;
BEGIN
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
$fn$;

CREATE OR REPLACE FUNCTION public.archive_order(
  order_id uuid,
  restaurant_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order_id uuid := $1;
  v_restaurant_id uuid := $2;
  v_archived_records integer := 0;
BEGIN
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
    format('batch_id IN (SELECT ob.id FROM public.order_batches ob WHERE ob.order_id = %L)', v_order_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'order_guests',
    'order_guests_archive',
    format('order_id = %L', v_order_id)
  );

  v_archived_records := v_archived_records + public.archive_insert_matching_columns(
    'payments',
    'payments_archive',
    format('order_id = %L', v_order_id)
  );

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'order_guest_charges'
  ) THEN
    v_archived_records := v_archived_records + public.archive_insert_matching_columns(
      'order_guest_charges',
      'order_guest_charges_archive',
      format('order_id = %L', v_order_id)
    );
    DELETE FROM public.order_guest_charges ogc WHERE ogc.order_id = v_order_id;
  END IF;

  DELETE FROM public.order_items oi
  WHERE oi.batch_id IN (
    SELECT ob.id FROM public.order_batches ob WHERE ob.order_id = v_order_id
  );
  DELETE FROM public.payments p WHERE p.order_id = v_order_id;
  DELETE FROM public.order_guests og WHERE og.order_id = v_order_id;
  DELETE FROM public.order_batches ob WHERE ob.order_id = v_order_id;
  DELETE FROM public.orders o
  WHERE o.id = v_order_id
    AND o.restaurant_id = v_restaurant_id;

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
$fn$;

CREATE OR REPLACE FUNCTION public.archive_closed_orders(p_restaurant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_order record;
  v_result json;
  v_archived_orders integer := 0;
  v_errors jsonb := '[]'::jsonb;
BEGIN
  FOR v_order IN
    SELECT id
    FROM public.orders
    WHERE restaurant_id = p_restaurant_id
      AND status IN ('CERRADO', 'Pagado')
    ORDER BY created_at ASC
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
$fn$;

GRANT EXECUTE ON FUNCTION public.archive_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_closed_orders(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
