-- Permite que el admin lea ordenes archivadas y sus datos relacionados.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.orders_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_batches_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_guests_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_archive ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.orders_archive TO authenticated;
GRANT SELECT ON public.order_batches_archive TO authenticated;
GRANT SELECT ON public.order_items_archive TO authenticated;
GRANT SELECT ON public.order_guests_archive TO authenticated;
GRANT SELECT ON public.payments_archive TO authenticated;

DROP POLICY IF EXISTS "archive_orders_read_by_restaurant" ON public.orders_archive;
CREATE POLICY "archive_orders_read_by_restaurant"
  ON public.orders_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role = 'super_admin'
          OR p.restaurant_id = orders_archive.restaurant_id
        )
    )
  );

DROP POLICY IF EXISTS "archive_batches_read_by_restaurant" ON public.order_batches_archive;
CREATE POLICY "archive_batches_read_by_restaurant"
  ON public.order_batches_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders_archive oa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE oa.id = order_batches_archive.order_id
        AND (
          p.role = 'super_admin'
          OR p.restaurant_id = oa.restaurant_id
        )
    )
  );

DROP POLICY IF EXISTS "archive_items_read_by_restaurant" ON public.order_items_archive;
CREATE POLICY "archive_items_read_by_restaurant"
  ON public.order_items_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_batches_archive oba
      JOIN public.orders_archive oa ON oa.id = oba.order_id
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE oba.id = order_items_archive.batch_id
        AND (
          p.role = 'super_admin'
          OR p.restaurant_id = oa.restaurant_id
        )
    )
  );

DROP POLICY IF EXISTS "archive_guests_read_by_restaurant" ON public.order_guests_archive;
CREATE POLICY "archive_guests_read_by_restaurant"
  ON public.order_guests_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders_archive oa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE oa.id = order_guests_archive.order_id
        AND (
          p.role = 'super_admin'
          OR p.restaurant_id = oa.restaurant_id
        )
    )
  );

DROP POLICY IF EXISTS "archive_payments_read_by_restaurant" ON public.payments_archive;
CREATE POLICY "archive_payments_read_by_restaurant"
  ON public.payments_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders_archive oa
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE oa.id = payments_archive.order_id
        AND (
          p.role = 'super_admin'
          OR p.restaurant_id = oa.restaurant_id
        )
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'order_guest_charges_archive'
  ) THEN
    EXECUTE 'ALTER TABLE public.order_guest_charges_archive ENABLE ROW LEVEL SECURITY';
    EXECUTE 'GRANT SELECT ON public.order_guest_charges_archive TO authenticated';
    EXECUTE 'DROP POLICY IF EXISTS "archive_charges_read_by_restaurant" ON public.order_guest_charges_archive';
    EXECUTE $policy$
      CREATE POLICY "archive_charges_read_by_restaurant"
        ON public.order_guest_charges_archive
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.orders_archive oa
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE oa.id = order_guest_charges_archive.order_id
              AND (
                p.role = 'super_admin'
                OR p.restaurant_id = oa.restaurant_id
              )
          )
        )
    $policy$;
  END IF;
END $$;

SELECT
  'orders_archive_visible_to_current_user' AS check_name,
  COUNT(*) AS visible_rows
FROM public.orders_archive;
