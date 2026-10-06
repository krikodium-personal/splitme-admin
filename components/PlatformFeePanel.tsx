import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import {
  DEFAULT_TIER_DRAFTS,
  PlatformFeeTier,
  calendarMonthBounds,
  formatArs,
  formatFeePercent,
  resolveFeeTier,
} from '../lib/platformFee';

type Props = {
  /** null = tramos globales */
  restaurantId?: string | null;
  editable?: boolean;
  title?: string;
  subtitle?: string;
};

const emptyTier = (): PlatformFeeTier => ({
  sort_order: 1,
  fee_bps: 0,
  min_transactions: 0,
  min_sales_amount: 0,
  label: '',
});

export const PlatformFeePanel: React.FC<Props> = ({
  restaurantId = null,
  editable = false,
  title = 'Comisión SplitMe',
  subtitle = 'Liquidación aparte con el local. No se descuenta en Mercado Pago.',
}) => {
  const [tiers, setTiers] = useState<PlatformFeeTier[]>([]);
  const [source, setSource] = useState<'restaurant' | 'global' | 'none'>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [txCount, setTxCount] = useState(0);
  const [salesAmount, setSalesAmount] = useState(0);

  const { start, end } = useMemo(() => calendarMonthBounds(), []);
  const monthLabel = start.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const activeTier = tiers;
  const resolved = resolveFeeTier(activeTier, txCount, salesAmount);
  const estimatedFee = salesAmount * ((resolved?.fee_bps || 0) / 10000);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      let used: PlatformFeeTier[] = [];
      let src: 'restaurant' | 'global' | 'none' = 'none';

      if (restaurantId) {
        const { data: own, error: ownErr } = await supabase
          .from('platform_fee_tiers')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('sort_order');
        if (ownErr) throw ownErr;
        if (own && own.length > 0) {
          used = own;
          src = 'restaurant';
        }
      }

      if (used.length === 0) {
        const { data: global, error: gErr } = await supabase
          .from('platform_fee_tiers')
          .select('*')
          .is('restaurant_id', null)
          .order('sort_order');
        if (gErr) throw gErr;
        used = global || [];
        src = used.length ? 'global' : 'none';
      }

      setTiers(used);
      setSource(src);

      if (restaurantId) {
        const startIso = start.toISOString();
        const endIso = end.toISOString();
        const { data: orders, error: oErr } = await supabase
          .from('orders')
          .select('id, order_guest_charges(amount, status, paid_at)')
          .eq('restaurant_id', restaurantId);
        if (oErr) throw oErr;
        let count = 0;
        let sales = 0;
        for (const order of orders || []) {
          const charges = (order as any).order_guest_charges || [];
          for (const charge of charges) {
            if (charge.status !== 'paid' || !charge.paid_at) continue;
            const paidAt = new Date(charge.paid_at).getTime();
            if (paidAt >= start.getTime() && paidAt < end.getTime()) {
              count += 1;
              sales += Number(charge.amount || 0);
            }
          }
        }
        setTxCount(count);
        setSalesAmount(sales);
      } else {
        setTxCount(0);
        setSalesAmount(0);
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err?.message || 'No se pudieron cargar los tramos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const updateTier = (index: number, patch: Partial<PlatformFeeTier>) => {
    setTiers(prev => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };

  const addTier = () => {
    setTiers(prev => [
      ...prev,
      {
        ...emptyTier(),
        sort_order: (prev[prev.length - 1]?.sort_order || 0) + 1,
        restaurant_id: restaurantId,
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers(prev => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, sort_order: i + 1 })));
  };

  const resetToDefaults = () => {
    setTiers(DEFAULT_TIER_DRAFTS.map((t, i) => ({
      ...t,
      sort_order: i + 1,
      restaurant_id: restaurantId,
    })));
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Borrar tramos del scope y reinsertar
      let del = supabase.from('platform_fee_tiers').delete();
      del = restaurantId
        ? del.eq('restaurant_id', restaurantId)
        : del.is('restaurant_id', null);
      const { error: delErr } = await del;
      if (delErr) throw delErr;

      const payload = tiers.map((t, i) => ({
        restaurant_id: restaurantId,
        sort_order: i + 1,
        fee_bps: Math.min(10000, Math.max(0, Math.round(Number(t.fee_bps) || 0))),
        min_transactions: Math.max(0, Math.round(Number(t.min_transactions) || 0)),
        min_sales_amount: Math.max(0, Number(t.min_sales_amount) || 0),
        label: (t.label || '').trim() || null,
        updated_at: new Date().toISOString(),
      }));

      if (payload.length > 0) {
        const { error: insErr } = await supabase.from('platform_fee_tiers').insert(payload);
        if (insErr) throw insErr;
      }

      setMessage({ type: 'success', text: 'Tramos guardados.' });
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error al guardar.' });
    } finally {
      setSaving(false);
    }
  };

  const useGlobalForRestaurant = async () => {
    if (!restaurantId) return;
    if (!confirm('¿Borrar tramos personalizados de este local y volver a los globales?')) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('platform_fee_tiers')
        .delete()
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Este local vuelve a usar los tramos globales.' });
      await load();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'No se pudo volver a globales.' });
    } finally {
      setSaving(false);
    }
  };

  const copyGlobalToRestaurant = async () => {
    if (!restaurantId) return;
    const { data: global, error } = await supabase
      .from('platform_fee_tiers')
      .select('*')
      .is('restaurant_id', null)
      .order('sort_order');
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setTiers((global || []).map((t, i) => ({
      ...t,
      id: undefined,
      restaurant_id: restaurantId,
      sort_order: i + 1,
    })));
    setSource('restaurant');
    setMessage({ type: 'success', text: 'Copié los globales. Revisá y guardá para personalizar este local.' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[3rem] border border-gray-100 p-12 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 className="animate-spin" size={20} />
        <span className="text-xs font-black uppercase tracking-widest">Cargando comisión…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
      <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">{subtitle}</p>
        </div>
        {restaurantId && (
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mes en curso</p>
            <p className="text-sm font-bold text-gray-800 capitalize">{monthLabel}</p>
          </div>
        )}
      </div>

      <div className="p-10 space-y-8">
        {restaurantId && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Stat label="Transacciones pagadas" value={String(txCount)} />
            <Stat label="Ventas pagadas" value={formatArs(salesAmount)} />
            <Stat
              label="Tramo actual"
              value={resolved ? formatFeePercent(resolved.fee_bps) : '—'}
              hint={resolved?.label || undefined}
            />
            <Stat label="Fee estimado del mes" value={formatArs(estimatedFee)} hint="Ventas × % del tramo" />
          </div>
        )}

        <p className="text-xs text-gray-500 font-medium">
          Fuente de tramos:{' '}
          <strong>
            {source === 'restaurant' ? 'Personalizados de este local' : source === 'global' ? 'Globales (todos los locales)' : 'Sin definir'}
          </strong>
          . Regla: el % del mes es plano; se elige el tramo más alto alcanzado por transacciones <strong>o</strong> ventas.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Desde tx</th>
                <th className="px-4 py-3">Desde ventas (ARS)</th>
                <th className="px-4 py-3">Fee (bps)</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Etiqueta</th>
                {editable && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, index) => {
                const isActive = resolved?.sort_order === tier.sort_order && resolved?.fee_bps === tier.fee_bps;
                return (
                  <tr key={tier.id || index} className={`border-t border-gray-50 ${isActive ? 'bg-indigo-50/50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <input
                          type="number"
                          min={0}
                          value={tier.min_transactions}
                          onChange={e => updateTier(index, { min_transactions: Number(e.target.value) || 0 })}
                          className="w-28 bg-gray-50 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="font-bold">{tier.min_transactions.toLocaleString('es-AR')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <input
                          type="number"
                          min={0}
                          value={tier.min_sales_amount}
                          onChange={e => updateTier(index, { min_sales_amount: Number(e.target.value) || 0 })}
                          className="w-40 bg-gray-50 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="font-bold">{formatArs(Number(tier.min_sales_amount))}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <input
                          type="number"
                          min={0}
                          max={10000}
                          value={tier.fee_bps}
                          onChange={e => updateTier(index, { fee_bps: Number(e.target.value) || 0 })}
                          className="w-24 bg-gray-50 rounded-xl px-3 py-2 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="font-bold">{tier.fee_bps}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-black text-indigo-700">{formatFeePercent(tier.fee_bps)}</td>
                    <td className="px-4 py-3">
                      {editable ? (
                        <input
                          type="text"
                          value={tier.label || ''}
                          onChange={e => updateTier(index, { label: e.target.value })}
                          className="w-full min-w-[12rem] bg-gray-50 rounded-xl px-3 py-2 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-gray-600">{tier.label || '—'}</span>
                      )}
                    </td>
                    {editable && (
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => removeTier(index)} className="text-rose-500 hover:text-rose-700 p-2">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {tiers.length === 0 && (
                <tr>
                  <td colSpan={editable ? 7 : 6} className="px-4 py-8 text-center text-gray-400 font-medium">
                    No hay tramos definidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {editable && (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addTier} className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} /> Tramo
            </button>
            <button type="button" onClick={resetToDefaults} className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <RefreshCw size={14} /> Defaults 2% / 1% / 0,6%
            </button>
            {restaurantId && source === 'global' && (
              <button type="button" onClick={copyGlobalToRestaurant} className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-widest">
                Personalizar este local
              </button>
            )}
            {restaurantId && source === 'restaurant' && (
              <button type="button" onClick={useGlobalForRestaurant} className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs font-black uppercase tracking-widest">
                Volver a globales
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="ml-auto px-6 py-3 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar tramos
            </button>
          </div>
        )}

        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 border-2 ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <p className="font-bold text-xs">{message.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-5">
    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">{label}</p>
    <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
    {hint && <p className="text-[11px] text-gray-500 mt-1 font-medium">{hint}</p>}
  </div>
);

export default PlatformFeePanel;
