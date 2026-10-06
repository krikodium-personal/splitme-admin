export type PlatformFeeTier = {
  id?: string;
  restaurant_id?: string | null;
  sort_order: number;
  fee_bps: number;
  min_transactions: number;
  min_sales_amount: number;
  label?: string | null;
};

export type MonthVolume = {
  transactionCount: number;
  salesAmount: number;
  periodStart: string;
  periodEnd: string;
};

export type ResolvedFee = {
  feeBps: number;
  tier: PlatformFeeTier | null;
  source: 'restaurant' | 'global' | 'none';
};

/** Inicio/fin del mes calendario en ISO (UTC local del navegador vía Date). */
export function calendarMonthBounds(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

/**
 * Elige el tramo con umbral más alto que ya se alcanzó (tx >= min OR ventas >= min).
 * Si nadie califica salvo el de 0/0, queda el tramo base.
 */
export function resolveFeeTier(
  tiers: PlatformFeeTier[],
  transactionCount: number,
  salesAmount: number,
): PlatformFeeTier | null {
  if (!tiers.length) return null;
  const sorted = [...tiers].sort((a, b) => {
    if (b.min_transactions !== a.min_transactions) return b.min_transactions - a.min_transactions;
    return Number(b.min_sales_amount) - Number(a.min_sales_amount);
  });
  for (const tier of sorted) {
    if (
      transactionCount >= tier.min_transactions ||
      salesAmount >= Number(tier.min_sales_amount)
    ) {
      return tier;
    }
  }
  return sorted[sorted.length - 1] || null;
}

export function formatFeePercent(bps: number): string {
  return `${(bps / 100).toFixed(2).replace('.', ',')}%`;
}

export function formatArs(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export const DEFAULT_TIER_DRAFTS: Omit<PlatformFeeTier, 'id' | 'restaurant_id'>[] = [
  { sort_order: 1, fee_bps: 200, min_transactions: 0, min_sales_amount: 0, label: 'Hasta 1.000 tx y $20M — 2%' },
  { sort_order: 2, fee_bps: 100, min_transactions: 1001, min_sales_amount: 20000001, label: 'Desde 1.001 tx o $20.000.001 — 1%' },
  { sort_order: 3, fee_bps: 60, min_transactions: 2000, min_sales_amount: 40000001, label: 'Desde 2.000 tx o $40.000.001 — 0,6%' },
];
