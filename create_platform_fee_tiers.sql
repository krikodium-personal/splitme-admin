-- Tramos de comisión SplitMe (liquidación aparte; no marketplace_fee de MP)
-- Ya aplicada vía MCP; este archivo queda como referencia en el repo.

CREATE TABLE IF NOT EXISTS public.platform_fee_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 1,
  fee_bps integer NOT NULL CHECK (fee_bps >= 0 AND fee_bps <= 10000),
  min_transactions integer NOT NULL DEFAULT 0 CHECK (min_transactions >= 0),
  min_sales_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (min_sales_amount >= 0),
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_fee_tiers IS
  'Tramos de fee SplitMe. restaurant_id NULL = defaults globales. % plano del mes según volumen (tx O ventas). Liquidación aparte.';
