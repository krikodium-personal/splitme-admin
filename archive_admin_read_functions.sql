-- Lectura segura de ordenes archivadas para splitme-admin.
-- Ejecutar completo en Supabase SQL Editor con "Run without RLS".

CREATE OR REPLACE FUNCTION public.archive_admin_can_read(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin'
        OR p.restaurant_id = p_restaurant_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_get_orders_archive(p_restaurant_id uuid)
RETURNS SETOF public.orders_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oa.*
  FROM public.orders_archive oa
  WHERE oa.restaurant_id = p_restaurant_id
    AND public.archive_admin_can_read(p_restaurant_id)
  ORDER BY COALESCE(oa.archived_at, oa.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_order_batches_archive(p_restaurant_id uuid)
RETURNS SETOF public.order_batches_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oba.*
  FROM public.order_batches_archive oba
  JOIN public.orders_archive oa ON oa.id = oba.order_id
  WHERE oa.restaurant_id = p_restaurant_id
    AND public.archive_admin_can_read(p_restaurant_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_get_order_items_archive(p_restaurant_id uuid)
RETURNS SETOF public.order_items_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oia.*
  FROM public.order_items_archive oia
  JOIN public.order_batches_archive oba ON oba.id = oia.batch_id
  JOIN public.orders_archive oa ON oa.id = oba.order_id
  WHERE oa.restaurant_id = p_restaurant_id
    AND public.archive_admin_can_read(p_restaurant_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_get_order_guests_archive(p_restaurant_id uuid)
RETURNS SETOF public.order_guests_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oga.*
  FROM public.order_guests_archive oga
  JOIN public.orders_archive oa ON oa.id = oga.order_id
  WHERE oa.restaurant_id = p_restaurant_id
    AND public.archive_admin_can_read(p_restaurant_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_get_payments_archive(p_restaurant_id uuid)
RETURNS SETOF public.payments_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.*
  FROM public.payments_archive pa
  JOIN public.orders_archive oa ON oa.id = pa.order_id
  WHERE oa.restaurant_id = p_restaurant_id
    AND public.archive_admin_can_read(p_restaurant_id);
$$;

GRANT EXECUTE ON FUNCTION public.archive_admin_can_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_orders_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_order_batches_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_order_items_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_order_guests_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_payments_archive(uuid) TO authenticated;

SELECT public.archive_admin_can_read('6283c4ef-910a-403b-8759-3e75e1798c51'::uuid) AS can_read_soraya_archive;

-- Variante preferida para la app: resuelve el restaurante desde profiles/auth.uid().
-- En SQL Editor puede devolver 0 filas porque auth.uid() suele ser NULL ahi.
CREATE OR REPLACE FUNCTION public.admin_get_my_orders_archive()
RETURNS SETOF public.orders_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oa.*
  FROM public.orders_archive oa
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE p.role = 'super_admin'
    OR p.restaurant_id = oa.restaurant_id
  ORDER BY COALESCE(oa.archived_at, oa.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_my_order_batches_archive()
RETURNS SETOF public.order_batches_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oba.*
  FROM public.order_batches_archive oba
  JOIN public.orders_archive oa ON oa.id = oba.order_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE p.role = 'super_admin'
    OR p.restaurant_id = oa.restaurant_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_my_order_items_archive()
RETURNS SETOF public.order_items_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oia.*
  FROM public.order_items_archive oia
  JOIN public.order_batches_archive oba ON oba.id = oia.batch_id
  JOIN public.orders_archive oa ON oa.id = oba.order_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE p.role = 'super_admin'
    OR p.restaurant_id = oa.restaurant_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_my_order_guests_archive()
RETURNS SETOF public.order_guests_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oga.*
  FROM public.order_guests_archive oga
  JOIN public.orders_archive oa ON oa.id = oga.order_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE p.role = 'super_admin'
    OR p.restaurant_id = oa.restaurant_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_my_payments_archive()
RETURNS SETOF public.payments_archive
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa.*
  FROM public.payments_archive pa
  JOIN public.orders_archive oa ON oa.id = pa.order_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE p.role = 'super_admin'
    OR p.restaurant_id = oa.restaurant_id;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_my_orders_archive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_my_order_batches_archive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_my_order_items_archive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_my_order_guests_archive() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_my_payments_archive() TO authenticated;
