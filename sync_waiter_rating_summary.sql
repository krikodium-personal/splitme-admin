-- Mantiene waiters.average_rating y waiters.waiter_rating_count sincronizados.
-- Fuente de verdad: reviews.waiter_rating + reviews_archive.waiter_rating.

ALTER TABLE public.waiters
ADD COLUMN IF NOT EXISTS waiter_rating_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_waiter_rating_summary(
  p_waiter_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_average_rating numeric;
  v_rating_count integer;
BEGIN
  SELECT
    ROUND(AVG(r.rating)::numeric, 1),
    COUNT(*)::integer
    INTO v_average_rating, v_rating_count
  FROM (
    SELECT rv.waiter_rating::numeric AS rating
    FROM public.reviews rv
    WHERE rv.waiter_id = p_waiter_id
      AND rv.waiter_rating IS NOT NULL
      AND rv.waiter_rating > 0

    UNION ALL

    SELECT rva.waiter_rating::numeric AS rating
    FROM public.reviews_archive rva
    WHERE rva.waiter_id = p_waiter_id
      AND rva.waiter_rating IS NOT NULL
      AND rva.waiter_rating > 0
  ) r;

  UPDATE public.waiters
  SET
    average_rating = COALESCE(v_average_rating, 0),
    waiter_rating_count = COALESCE(v_rating_count, 0)
  WHERE id = p_waiter_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_waiter_rating_summary(
  p_restaurant_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer := 0;
BEGIN
  WITH ratings AS (
    SELECT rv.waiter_id, rv.waiter_rating::numeric AS rating
    FROM public.reviews rv
    WHERE rv.waiter_rating IS NOT NULL
      AND rv.waiter_rating > 0

    UNION ALL

    SELECT rva.waiter_id, rva.waiter_rating::numeric AS rating
    FROM public.reviews_archive rva
    WHERE rva.waiter_rating IS NOT NULL
      AND rva.waiter_rating > 0
  ),
  summary AS (
    SELECT
      w.id AS waiter_id,
      ROUND(AVG(r.rating)::numeric, 1) AS average_rating,
      COUNT(*)::integer AS waiter_rating_count
    FROM public.waiters w
    LEFT JOIN ratings r ON r.waiter_id = w.id
    WHERE p_restaurant_id IS NULL
      OR w.restaurant_id = p_restaurant_id
    GROUP BY w.id
  )
  UPDATE public.waiters w
  SET
    average_rating = COALESCE(s.average_rating, 0),
    waiter_rating_count = COALESCE(s.waiter_rating_count, 0)
  FROM summary s
  WHERE w.id = s.waiter_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_waiter_rating_summary(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_waiter_rating_summary(uuid) TO anon, authenticated;

-- Ejecutar una vez para formar la primera lista completa:
-- SELECT public.refresh_waiter_rating_summary();
-- O solo para Soraya:
-- SELECT public.refresh_waiter_rating_summary('6283c4ef-910a-403b-8759-3e75e1798c51');
