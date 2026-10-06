import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';
import { Trash2, Plus, Eye, EyeOff, Loader2, X, Pencil, Search, Percent, AlertTriangle, CalendarDays, Clock } from 'lucide-react';

type PromoType = 'nxm' | 'percent' | 'fixed_price' | 'amount_off' | 'second_unit';

interface Promotion {
  id: string;
  restaurant_id: string;
  name: string;
  type: PromoType;
  buy_qty: number | null;
  pay_qty: number | null;
  percent: number | null;
  amount: number | null;
  fixed_price: number | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  promotion_menu_items: { menu_item_id: string }[];
}

interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
}

interface MenuItemOption {
  id: string;
  name: string;
  category_id: string | null;
  price: number | null;
}

interface FormState {
  id: string | null;
  name: string;
  type: PromoType;
  buy_qty: string;
  pay_qty: string;
  percent: string;
  amount: string;
  fixed_price: string;
  active: boolean;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  menu_item_ids: string[];
}

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const TYPE_OPTIONS: { id: PromoType; label: string; hint: string }[] = [
  { id: 'nxm', label: 'Llevá N, pagá M', hint: '2x1, 3x2… Cuenta las unidades de toda la mesa y reparte el descuento entre ellas.' },
  { id: 'second_unit', label: '2da unidad al X% off', hint: 'Cada 2 unidades (de toda la mesa), una sale con descuento.' },
  { id: 'percent', label: 'X% de descuento', hint: 'Descuento porcentual en cada unidad.' },
  { id: 'amount_off', label: '$X menos por unidad', hint: 'Resta un monto fijo a cada unidad.' },
  { id: 'fixed_price', label: 'Precio promocional $X', hint: 'Reemplaza el precio base del producto. Los extras de variantes se suman encima.' },
];

const DAY_CHIPS: { label: string; value: number }[] = [
  { label: 'Lu', value: 1 },
  { label: 'Ma', value: 2 },
  { label: 'Mi', value: 3 },
  { label: 'Ju', value: 4 },
  { label: 'Vi', value: 5 },
  { label: 'Sá', value: 6 },
  { label: 'Do', value: 0 },
];

const NXM_PRESETS: [number, number][] = [[2, 1], [3, 2], [4, 3]];

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  type: 'nxm',
  buy_qty: '2',
  pay_qty: '1',
  percent: '',
  amount: '',
  fixed_price: '',
  active: true,
  start_date: '',
  end_date: '',
  days_of_week: [],
  start_time: '',
  end_time: '',
  menu_item_ids: [],
};

const money = (n: number) => `$${n.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const num = (n: number | null) => Number(n ?? 0);
const normalizeTime = (t: string) => (t.length === 5 ? `${t}:00` : t.slice(0, 8));

const nowInBuenosAires = (now: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return { dow: WEEKDAY_INDEX[get('weekday')], time: `${get('hour')}:${get('minute')}:${get('second')}` };
};

const dateInBuenosAires = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);

const addOneDay = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

const startDateOf = (p: Promotion) => (p.starts_at ? dateInBuenosAires(new Date(p.starts_at)) : '');
const endDateOf = (p: Promotion) => (p.ends_at ? dateInBuenosAires(new Date(new Date(p.ends_at).getTime() - 1)) : '');
const shortDate = (date: string) => date.split('-').reverse().slice(0, 2).join('/');

const isLiveNow = (p: Promotion, now: Date) => {
  if (!p.active) return false;
  if (p.starts_at && now < new Date(p.starts_at)) return false;
  if (p.ends_at && now >= new Date(p.ends_at)) return false;
  const { dow, time } = nowInBuenosAires(now);
  if (p.days_of_week?.length && !p.days_of_week.includes(dow)) return false;
  if (p.start_time && p.end_time) {
    const start = normalizeTime(p.start_time);
    const end = normalizeTime(p.end_time);
    const inWindow = start <= end ? time >= start && time < end : time >= start || time < end;
    if (!inWindow) return false;
  }
  return true;
};

const badgeText = (p: Pick<Promotion, 'type' | 'buy_qty' | 'pay_qty' | 'percent' | 'amount' | 'fixed_price'>) => {
  switch (p.type) {
    case 'nxm': return `${num(p.buy_qty)}x${num(p.pay_qty)}`;
    case 'percent': return `${num(p.percent)}% OFF`;
    case 'second_unit': return `2da al ${num(p.percent)}%`;
    case 'amount_off': return `${money(num(p.amount))} OFF`;
    case 'fixed_price': return `Precio promo ${money(num(p.fixed_price))}`;
  }
};

const daysSummary = (days: number[] | null) => {
  if (!days?.length || days.length === 7) return 'Todos los días';
  return DAY_CHIPS.filter(d => days.includes(d.value)).map(d => d.label).join(', ');
};

const scheduleSummary = (p: Promotion) => {
  const parts = [daysSummary(p.days_of_week)];
  parts.push(p.start_time && p.end_time ? `${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)} h` : 'todo el día');
  const start = startDateOf(p);
  const end = endDateOf(p);
  if (start && end) parts.push(`del ${shortDate(start)} al ${shortDate(end)}`);
  else if (start) parts.push(`desde el ${shortDate(start)}`);
  else if (end) parts.push(`hasta el ${shortDate(end)}`);
  return parts.join(' · ');
};

const formFromPromotion = (p: Promotion): FormState => ({
  id: p.id,
  name: p.name,
  type: p.type,
  buy_qty: p.buy_qty?.toString() ?? '2',
  pay_qty: p.pay_qty?.toString() ?? '1',
  percent: p.percent?.toString() ?? '',
  amount: p.amount?.toString() ?? '',
  fixed_price: p.fixed_price?.toString() ?? '',
  active: p.active,
  start_date: startDateOf(p),
  end_date: endDateOf(p),
  days_of_week: p.days_of_week ?? [],
  start_time: p.start_time?.slice(0, 5) ?? '',
  end_time: p.end_time?.slice(0, 5) ?? '',
  menu_item_ids: p.promotion_menu_items.map(pmi => pmi.menu_item_id),
});

const validateForm = (f: FormState): string | null => {
  if (!f.name.trim()) return 'Poné un nombre a la promoción.';
  const n = Number(f.buy_qty), m = Number(f.pay_qty), pct = Number(f.percent);
  if (f.type === 'nxm' && (!Number.isInteger(n) || !Number.isInteger(m) || n < 2 || m < 1 || m >= n)) {
    return 'En "Llevá N, pagá M", N tiene que ser al menos 2 y M entre 1 y N − 1.';
  }
  if ((f.type === 'percent' || f.type === 'second_unit') && (f.percent === '' || !(pct > 0 && pct <= 100))) {
    return 'El porcentaje tiene que ser mayor a 0 y hasta 100.';
  }
  if (f.type === 'amount_off' && (f.amount === '' || !(Number(f.amount) > 0))) return 'El monto a descontar tiene que ser mayor a 0.';
  if (f.type === 'fixed_price' && (f.fixed_price === '' || !(Number(f.fixed_price) >= 0))) return 'Ingresá un precio promocional válido.';
  if (f.start_date && f.end_date && f.end_date < f.start_date) return 'La fecha de fin no puede ser anterior a la de inicio.';
  if (!!f.start_time !== !!f.end_time) return 'Completá las dos horas (desde y hasta) o dejá ambas vacías.';
  if (f.start_time && f.start_time === f.end_time) return 'La hora de inicio y de fin no pueden ser iguales.';
  if (f.menu_item_ids.length === 0) return 'Elegí al menos un producto.';
  return null;
};

const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    setLoading(true);
    const [{ data: promos, error }, { data: cats }, { data: items }] = await Promise.all([
      supabase
        .from('promotions')
        .select('*, promotion_menu_items(menu_item_id)')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name, parent_id, sort_order')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('id, name, category_id, price')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('sort_order', { ascending: true }),
    ]);
    if (error) console.error('Error cargando promociones:', error);
    setPromotions((promos || []) as unknown as Promotion[]);
    setCategories(cats || []);
    setMenuItems(items || []);
    setLoading(false);
  };

  const menuItemById = useMemo(() => new Map(menuItems.map(i => [i.id, i])), [menuItems]);

  const menuItemGroups = useMemo(() => {
    const ordered: { id: string | null; label: string }[] = [];
    categories.filter(c => !c.parent_id).forEach(cat => {
      ordered.push({ id: cat.id, label: cat.name });
      categories.filter(c => c.parent_id === cat.id).forEach(sub => ordered.push({ id: sub.id, label: `${cat.name} › ${sub.name}` }));
    });
    const known = new Set(categories.map(c => c.id));
    ordered.push({ id: null, label: 'Sin categoría' });
    return ordered
      .map(group => ({
        ...group,
        items: menuItems.filter(i => (group.id === null ? !i.category_id || !known.has(i.category_id) : i.category_id === group.id)),
      }))
      .filter(group => group.items.length > 0);
  }, [categories, menuItems]);

  const updatePromotion = async (promo: Promotion, patch: Partial<Promotion>) => {
    setPromotions(prev => prev.map(p => (p.id === promo.id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from('promotions').update(patch).eq('id', promo.id);
    if (error) {
      setPromotions(prev => prev.map(p => (p.id === promo.id ? promo : p)));
      alert('No se pudo actualizar la promoción. Probá de nuevo.');
    }
  };

  const deletePromotion = async (promo: Promotion) => {
    if (!confirm(`¿Eliminar la promoción "${promo.name}"?`)) return;
    const { error } = await supabase.from('promotions').delete().eq('id', promo.id);
    if (error) { alert('No se pudo eliminar la promoción. Probá de nuevo.'); return; }
    setPromotions(prev => prev.filter(p => p.id !== promo.id));
  };

  const openForm = (promo?: Promotion) => {
    setForm(promo ? formFromPromotion(promo) : { ...EMPTY_FORM });
    setFormError(null);
    setSearch('');
  };

  const closeForm = () => {
    if (saving) return;
    setForm(null);
  };

  const patchForm = (patch: Partial<FormState>) => setForm(prev => (prev ? { ...prev, ...patch } : prev));

  const toggleMenuItems = (ids: string[], select: boolean) => {
    setForm(prev => {
      if (!prev) return prev;
      const current = new Set(prev.menu_item_ids);
      ids.forEach(id => (select ? current.add(id) : current.delete(id)));
      return { ...prev, menu_item_ids: [...current] };
    });
  };

  const toggleDay = (day: number) => {
    setForm(prev => {
      if (!prev) return prev;
      const days = prev.days_of_week.includes(day) ? prev.days_of_week.filter(d => d !== day) : [...prev.days_of_week, day];
      return { ...prev, days_of_week: days.sort((a, b) => a - b) };
    });
  };

  const savePromotion = async () => {
    if (!form || !CURRENT_RESTAURANT?.id) return;
    const validation = validateForm(form);
    if (validation) { setFormError(validation); return; }
    setFormError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      type: form.type,
      buy_qty: form.type === 'nxm' ? Number(form.buy_qty) : null,
      pay_qty: form.type === 'nxm' ? Number(form.pay_qty) : null,
      percent: form.type === 'percent' || form.type === 'second_unit' ? Number(form.percent) : null,
      amount: form.type === 'amount_off' ? Number(form.amount) : null,
      fixed_price: form.type === 'fixed_price' ? Number(form.fixed_price) : null,
      active: form.active,
      starts_at: form.start_date ? `${form.start_date}T00:00:00-03:00` : null,
      ends_at: form.end_date ? `${addOneDay(form.end_date)}T00:00:00-03:00` : null,
      days_of_week: form.days_of_week.length > 0 && form.days_of_week.length < 7 ? form.days_of_week : null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    };

    let promoId = form.id;
    if (promoId) {
      const { error } = await supabase.from('promotions').update(payload).eq('id', promoId);
      if (error) { setSaving(false); setFormError(`No se pudo guardar la promoción: ${error.message}`); return; }
    } else {
      const { data, error } = await supabase
        .from('promotions')
        .insert({ ...payload, restaurant_id: CURRENT_RESTAURANT.id })
        .select('id')
        .single();
      if (error || !data) { setSaving(false); setFormError(`No se pudo crear la promoción: ${error?.message ?? ''}`); return; }
      promoId = (data as unknown as { id: string }).id;
    }

    const { error: deleteError } = await supabase.from('promotion_menu_items').delete().eq('promotion_id', promoId);
    const { error: insertError } = deleteError
      ? { error: deleteError }
      : await supabase.from('promotion_menu_items').insert(form.menu_item_ids.map(menu_item_id => ({ promotion_id: promoId, menu_item_id })));

    setSaving(false);
    if (insertError) {
      patchForm({ id: promoId });
      setFormError(`La promoción se guardó pero no sus productos: ${insertError.message}. Probá guardar de nuevo.`);
      fetchAll();
      return;
    }
    setForm(null);
    fetchAll();
  };

  const overlapWarnings = useMemo(() => {
    if (!form) return [];
    const selected = new Set(form.menu_item_ids);
    return promotions
      .filter(p => p.id !== form.id && p.active)
      .map(p => ({
        promo: p,
        items: p.promotion_menu_items.map(pmi => pmi.menu_item_id).filter(id => selected.has(id)),
      }))
      .filter(o => o.items.length > 0);
  }, [form, promotions]);

  const previewLine = (f: FormState) => {
    if (validateForm({ ...f, name: f.name || 'x', menu_item_ids: ['x'], start_date: '', end_date: '', start_time: '', end_time: '' })) return null;
    const firstItem = f.menu_item_ids.map(id => menuItemById.get(id)).find(i => i && i.price != null);
    const price = firstItem ? Number(firstItem.price) : 10000;
    const label = `${firstItem?.name ?? 'Producto'} ${money(price)}`;
    const pct = Number(f.percent);
    switch (f.type) {
      case 'nxm': return `${label} → ${f.buy_qty} unidades pagan ${money(Number(f.pay_qty) * price)}`;
      case 'second_unit': return `${label} → 2 unidades pagan ${money(Math.round((price + price * (1 - pct / 100)) * 100) / 100)}`;
      case 'percent': return `${label} → cada unidad queda en ${money(Math.round(price * (1 - pct / 100) * 100) / 100)}`;
      case 'amount_off': return `${label} → cada unidad queda en ${money(Math.max(0, price - Number(f.amount)))}`;
      case 'fixed_price': return `${label} → cada unidad queda en ${money(Number(f.fixed_price))} (+ extras de variantes)`;
    }
  };

  const renderStatus = (promo: Promotion) => {
    if (!promo.active) return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactiva</span>;
    return isLiveNow(promo, now)
      ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Vigente ahora</span>
      : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Fuera de horario</span>;
  };

  const renderProducts = (promo: Promotion) => {
    const names = promo.promotion_menu_items.map(pmi => menuItemById.get(pmi.menu_item_id)?.name).filter(Boolean) as string[];
    if (names.length === 0) return <span className="text-amber-600">Sin productos</span>;
    const shown = names.slice(0, 3).join(', ');
    return names.length > 3 ? `${shown} y ${names.length - 3} más` : shown;
  };

  const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';

  const renderForm = (f: FormState) => {
    const term = search.trim().toLowerCase();
    const visibleGroups = menuItemGroups
      .map(g => ({ ...g, items: term ? g.items.filter(i => i.name.toLowerCase().includes(term) || g.label.toLowerCase().includes(term)) : g.items }))
      .filter(g => g.items.length > 0);
    const selected = new Set(f.menu_item_ids);
    const preview = previewLine(f);

    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeForm}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{f.id ? 'Editar promoción' : 'Nueva promoción'}</h2>
            <button onClick={closeForm} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div>
              <label className={labelClass}>Nombre</label>
              <input value={f.name} onChange={e => patchForm({ name: e.target.value })} placeholder="Ej: Happy hour pintas 2x1" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Tipo</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TYPE_OPTIONS.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => patchForm({ type: t.id })}
                    className={`text-left rounded-xl border px-3 py-2 transition-colors ${f.type === t.id ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className={`text-sm font-semibold ${f.type === t.id ? 'text-indigo-700' : 'text-gray-800'}`}>{t.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{t.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              {f.type === 'nxm' && (
                <div className="flex items-end gap-3">
                  <div className="w-28">
                    <label className={labelClass}>Llevá (N)</label>
                    <input type="number" min={2} step={1} value={f.buy_qty} onChange={e => patchForm({ buy_qty: e.target.value })} className={inputClass} />
                  </div>
                  <div className="w-28">
                    <label className={labelClass}>Pagá (M)</label>
                    <input type="number" min={1} step={1} value={f.pay_qty} onChange={e => patchForm({ pay_qty: e.target.value })} className={inputClass} />
                  </div>
                  <div className="flex gap-1.5 pb-1">
                    {NXM_PRESETS.map(([n, m]) => (
                      <button
                        key={`${n}x${m}`}
                        type="button"
                        onClick={() => patchForm({ buy_qty: String(n), pay_qty: String(m) })}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${f.buy_qty === String(n) && f.pay_qty === String(m) ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                      >
                        {n}x{m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(f.type === 'percent' || f.type === 'second_unit') && (
                <div className="w-40">
                  <label className={labelClass}>{f.type === 'second_unit' ? '% off en la 2da' : '% de descuento'}</label>
                  <input type="number" min={1} max={100} step="any" value={f.percent} onChange={e => patchForm({ percent: e.target.value })} placeholder="Ej: 50" className={inputClass} />
                </div>
              )}
              {f.type === 'amount_off' && (
                <div className="w-48">
                  <label className={labelClass}>$ menos por unidad</label>
                  <input type="number" min={0} step="any" value={f.amount} onChange={e => patchForm({ amount: e.target.value })} placeholder="Ej: 500" className={inputClass} />
                </div>
              )}
              {f.type === 'fixed_price' && (
                <div className="w-48">
                  <label className={labelClass}>Precio promocional $</label>
                  <input type="number" min={0} step="any" value={f.fixed_price} onChange={e => patchForm({ fixed_price: e.target.value })} placeholder="Ej: 8000" className={inputClass} />
                </div>
              )}
              {preview && <p className="text-xs text-indigo-600 mt-2">Ej.: {preview}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos</span>
                <span className="text-xs text-gray-500">{f.menu_item_ids.length} seleccionado{f.menu_item_ids.length === 1 ? '' : 's'}</span>
              </div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto o categoría" className={`${inputClass} pl-8`} />
              </div>
              <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                {visibleGroups.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No hay productos que coincidan.</p>
                ) : visibleGroups.map(group => {
                  const ids = group.items.map(i => i.id);
                  const allSelected = ids.every(id => selected.has(id));
                  return (
                    <div key={group.id ?? 'none'} className="py-1">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-600">{group.label}</span>
                        <button type="button" onClick={() => toggleMenuItems(ids, !allSelected)} className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800">
                          {allSelected ? 'Quitar todos' : 'Elegir todos'}
                        </button>
                      </div>
                      {group.items.map(item => (
                        <label key={item.id} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={selected.has(item.id)} onChange={e => toggleMenuItems([item.id], e.target.checked)} className="accent-indigo-600" />
                          <span className="text-sm text-gray-800 flex-1 truncate">{item.name}</span>
                          {item.price != null && <span className="text-xs text-gray-400">{money(Number(item.price))}</span>}
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
              {overlapWarnings.length > 0 && (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 space-y-1">
                  <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle size={13} /> Productos que ya están en otra promo activa</p>
                  {overlapWarnings.map(({ promo, items }) => (
                    <p key={promo.id}>
                      “{promo.name}”: {items.map(id => menuItemById.get(id)?.name ?? 'Producto').join(', ')}
                    </p>
                  ))}
                  <p className="text-amber-700">Si se superponen en horario, se aplica la promo creada más recientemente.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Desde (opcional)</label>
                <input type="date" value={f.start_date} onChange={e => patchForm({ start_date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hasta (opcional, inclusive)</label>
                <input type="date" value={f.end_date} min={f.start_date || undefined} onChange={e => patchForm({ end_date: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Días (opcional)</label>
              <div className="flex flex-wrap gap-1.5">
                {DAY_CHIPS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`w-10 py-1.5 rounded-lg text-sm font-medium border transition-colors ${f.days_of_week.includes(d.value) ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Sin días marcados = todos los días.</p>
            </div>

            <div>
              <label className={labelClass}>Horario (opcional)</label>
              <div className="flex items-center gap-2">
                <input type="time" value={f.start_time} onChange={e => patchForm({ start_time: e.target.value })} className={`${inputClass} w-32`} />
                <span className="text-sm text-gray-400">a</span>
                <input type="time" value={f.end_time} onChange={e => patchForm({ end_time: e.target.value })} className={`${inputClass} w-32`} />
                {(f.start_time || f.end_time) && (
                  <button type="button" onClick={() => patchForm({ start_time: '', end_time: '' })} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Vacío = todo el día. Puede cruzar la medianoche (ej.: 22:00 a 02:00). Hora de Argentina.</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={f.active} onChange={e => patchForm({ active: e.target.checked })} className="accent-indigo-600" />
              <span className="text-sm text-gray-700">Promoción activa</span>
            </label>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 space-y-3">
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={closeForm} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancelar</button>
              <button
                onClick={savePromotion}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promociones</h1>
          <p className="text-sm text-gray-500 mt-1">Descuentos que se aplican automáticamente a los productos cuando la promo está vigente</p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          Nueva promoción
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : promotions.length === 0 ? (
        <div
          onClick={() => openForm()}
          className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center h-48 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-500 text-center px-6"
        >
          <Percent size={32} className="mb-3" />
          <p className="font-medium">Creá tu primera promoción</p>
          <p className="text-sm mt-1">Ej: “Happy hour 2x1 en pintas, de lunes a viernes de 18 a 20 h”</p>
        </div>
      ) : (
        <div className="space-y-4">
          {promotions.map(promo => (
            <div key={promo.id} className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm transition-opacity ${!promo.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 min-w-[72px] px-2.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold text-center">
                  {badgeText(promo)}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800 truncate">{promo.name}</p>
                    {renderStatus(promo)}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    <span className="font-medium text-gray-600">{promo.promotion_menu_items.length} producto{promo.promotion_menu_items.length === 1 ? '' : 's'}:</span> {renderProducts(promo)}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    {promo.start_time || promo.days_of_week?.length ? <Clock size={12} /> : <CalendarDays size={12} />}
                    {scheduleSummary(promo)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updatePromotion(promo, { active: !promo.active })} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title={promo.active ? 'Desactivar' : 'Activar'}>
                    {promo.active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button onClick={() => openForm(promo)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors" title="Editar">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => deletePromotion(promo)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && renderForm(form)}
    </div>
  );
};

export default PromotionsPage;
