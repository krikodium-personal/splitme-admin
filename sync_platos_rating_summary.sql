-- Mantiene public.platos_rating_summary sincronizada con los ratings reales.
-- Fuente de verdad: order_items.item_rating + order_items_archive.item_rating.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'platos_rating_summary'
      AND table_type = 'BASE TABLE'
  ) THEN
    RAISE EXCEPTION 'public.platos_rating_summary debe ser una tabla para poder actualizar promedios desde guests.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS platos_rating_summary_restaurant_plato_unique
  ON public.platos_rating_summary (restaurant_id, plato_nombre);

CREATE OR REPLACE FUNCTION public.set_order_item_rating(
  p_order_item_id uuid,
  p_rating numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_menu_item_id uuid;
BEGIN
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'item_rating debe estar entre 1 y 5';
  END IF;

  UPDATE public.order_items
  SET item_rating = p_rating
  WHERE id = p_order_item_id
  RETURNING menu_item_id INTO v_menu_item_id;

  IF v_menu_item_id IS NOT NULL THEN
    RETURN v_menu_item_id;
  END IF;

  UPDATE public.order_items_archive
  SET item_rating = p_rating
  WHERE id = p_order_item_id
  RETURNING menu_item_id INTO v_menu_item_id;

  RETURN v_menu_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_plato_rating_summary(
  p_restaurant_id uuid,
  p_menu_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plato_nombre text;
  v_promedio numeric;
  v_total_votos bigint;
BEGIN
  SELECT mi.name
    INTO v_plato_nombre
  FROM public.menu_items mi
  WHERE mi.id = p_menu_item_id
    AND mi.restaurant_id = p_restaurant_id;

  IF v_plato_nombre IS NULL THEN
    RETURN;
  END IF;

  SELECT
    ROUND(AVG(r.rating)::numeric, 1),
    COUNT(*)
    INTO v_promedio, v_total_votos
  FROM (
    SELECT oi.item_rating::numeric AS rating
    FROM public.order_items oi
    WHERE oi.menu_item_id = p_menu_item_id
      AND oi.item_rating IS NOT NULL
      AND oi.item_rating > 0

    UNION ALL

    SELECT oia.item_rating::numeric AS rating
    FROM public.order_items_archive oia
    WHERE oia.menu_item_id = p_menu_item_id
      AND oia.item_rating IS NOT NULL
      AND oia.item_rating > 0
  ) r;

  IF COALESCE(v_total_votos, 0) = 0 THEN
    DELETE FROM public.platos_rating_summary
    WHERE restaurant_id = p_restaurant_id
      AND plato_nombre = v_plato_nombre;
    RETURN;
  END IF;

  INSERT INTO public.platos_rating_summary (
    restaurant_id,
    plato_nombre,
    promedio,
    total_votos
  )
  VALUES (
    p_restaurant_id,
    v_plato_nombre,
    v_promedio,
    v_total_votos
  )
  ON CONFLICT (restaurant_id, plato_nombre)
  DO UPDATE SET
    promedio = EXCLUDED.promedio,
    total_votos = EXCLUDED.total_votos;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_platos_rating_summary(
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
    SELECT oi.menu_item_id, oi.item_rating::numeric AS rating
    FROM public.order_items oi
    WHERE oi.item_rating IS NOT NULL
      AND oi.item_rating > 0

    UNION ALL

    SELECT oia.menu_item_id, oia.item_rating::numeric AS rating
    FROM public.order_items_archive oia
    WHERE oia.item_rating IS NOT NULL
      AND oia.item_rating > 0
  ),
  summary AS (
    SELECT
      mi.restaurant_id,
      mi.name AS plato_nombre,
      ROUND(AVG(r.rating)::numeric, 1) AS promedio,
      COUNT(*)::bigint AS total_votos
    FROM ratings r
    JOIN public.menu_items mi ON mi.id = r.menu_item_id
    WHERE p_restaurant_id IS NULL
      OR mi.restaurant_id = p_restaurant_id
    GROUP BY mi.restaurant_id, mi.name
  )
  INSERT INTO public.platos_rating_summary (
    restaurant_id,
    plato_nombre,
    promedio,
    total_votos
  )
  SELECT
    restaurant_id,
    plato_nombre,
    promedio,
    total_votos
  FROM summary
  ON CONFLICT (restaurant_id, plato_nombre)
  DO UPDATE SET
    promedio = EXCLUDED.promedio,
    total_votos = EXCLUDED.total_votos;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.platos_rating_summary prs
  WHERE (p_restaurant_id IS NULL OR prs.restaurant_id = p_restaurant_id)
    AND NOT EXISTS (
      SELECT 1
      FROM (
        SELECT oi.menu_item_id, oi.item_rating::numeric AS rating
        FROM public.order_items oi
        WHERE oi.item_rating IS NOT NULL
          AND oi.item_rating > 0

        UNION ALL

        SELECT oia.menu_item_id, oia.item_rating::numeric AS rating
        FROM public.order_items_archive oia
        WHERE oia.item_rating IS NOT NULL
          AND oia.item_rating > 0
      ) r
      JOIN public.menu_items mi ON mi.id = r.menu_item_id
      WHERE mi.restaurant_id = prs.restaurant_id
        AND mi.name = prs.plato_nombre
    );

  RETURN v_rows;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_order_item_rating(uuid, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_plato_rating_summary(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_platos_rating_summary(uuid) TO anon, authenticated;

-- Ejecutar una vez para formar la primera lista completa:
-- SELECT public.refresh_platos_rating_summary();
-- O solo para Soraya:
-- SELECT public.refresh_platos_rating_summary('6283c4ef-910a-403b-8759-3e75e1798c51');
