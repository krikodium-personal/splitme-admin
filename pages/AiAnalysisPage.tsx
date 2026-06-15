import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';
import {
  BrainCircuit, TrendingUp, Users, Star, ShoppingBag, DollarSign,
  Award, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown, Loader2,
  Calendar, ChefHat, Zap, BarChart3, RefreshCw
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  guest_count: number;
  waiter_id: string | null;
}

interface AiPayment {
  order_id: string;
  amount: number;
  payment_method: string | null;
}

interface AiOrderItem {
  menu_item_id: string | null;
  name: string;
  quantity: number;
  batch_id: string;
}

interface AiOrderBatch {
  id: string;
  order_id: string;
}

interface AiReview {
  id: string;
  restaurant_rating: number | null;
  waiter_rating: number | null;
  comment: string | null;
  waiter_id: string | null;
  created_at: string;
}

interface AiWaiter {
  id: string;
  nickname: string;
  full_name: string;
  profile_photo_url: string | null;
  average_rating: number | null;
  waiter_rating_count: number | null;
}

interface AiMenuItem {
  id: string;
  name: string;
  average_rating: number | null;
  rating_count: number | null;
  times_ordered: number | null;
}

// ─── Archive helpers ──────────────────────────────────────────────────────────

const isMissingRpc = (e: any) =>
  e?.code === 'PGRST202' || e?.message?.includes('Could not find the function');

// ─── NLP helpers ─────────────────────────────────────────────────────────────

const POSITIVE_WORDS = [
  'excelente', 'increíble', 'increible', 'delicioso', 'deliciosa', 'rápido', 'rapido',
  'amable', 'atento', 'atenta', 'perfecto', 'perfecta', 'buenísimo', 'buenisimo',
  'rico', 'rica', 'espectacular', 'recomiendo', 'maravilloso', 'maravillosa',
  'genial', 'bueno', 'buena', 'bien', 'feliz', 'contento', 'contenta', 'satisfecho',
  'satisfecha', 'encantado', 'encantada', 'fantástico', 'fantastico', 'sabroso',
  'sabrosa', 'fresco', 'fresca', 'caliente', 'puntual', 'correcto', 'correcta',
  'agradable', '5 estrellas', 'top', 'nota 10', '10/10'
];

const NEGATIVE_WORDS = [
  'malo', 'mala', 'tarde', 'lento', 'lenta', 'frío', 'frio', 'frío', 'salado',
  'salada', 'crudo', 'cruda', 'espera', 'demoró', 'demoro', 'demora', 'error',
  'equivocado', 'equivocada', 'desagradable', 'pésimo', 'pesimo', 'horrible',
  'asco', 'sucio', 'sucia', 'descuidado', 'descuidada', 'caro', 'cara', 'defraudó',
  'decepcio', 'decepcion', 'mal', 'faltó', 'falto', 'olvidó', 'olvido', 'peor',
  'problema', 'queja', 'raro', 'rara', 'extraño', 'insípido', 'insipido', 'aguado'
];

const THEMES = {
  atencion: ['mesero', 'mesera', 'atención', 'atencion', 'servicio', 'trato', 'amable', 'amabilidad', 'educado', 'educada', 'sonrió', 'sonrio', 'ayudó', 'ayudo'],
  comida: ['comida', 'plato', 'sabor', 'rico', 'rica', 'delicioso', 'deliciosa', 'fresco', 'fresca', 'cocina', 'ingredientes', 'porción', 'porcion', 'calidad', 'menú', 'menu'],
  rapidez: ['rápido', 'rapido', 'lento', 'lenta', 'espera', 'tardó', 'tardo', 'tiempo', 'demora', 'demoró', 'demoro', 'ágil', 'agil', 'eficiente'],
  ambiente: ['ambiente', 'lugar', 'limpio', 'limpia', 'sucio', 'sucia', 'música', 'musica', 'decoración', 'decoracion', 'tranquilo', 'tranquila', 'cómodo', 'comodo', 'mesa'],
  precio: ['precio', 'barato', 'barata', 'caro', 'cara', 'vale', 'cuesta', 'paga', 'económico', 'economico', 'relación', 'relacion'],
};

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ─── Component ────────────────────────────────────────────────────────────────

const AiAnalysisPage: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // raw data
  const [orders, setOrders] = useState<AiOrder[]>([]);
  const [payments, setPayments] = useState<AiPayment[]>([]);
  const [orderItems, setOrderItems] = useState<AiOrderItem[]>([]);
  const [reviews, setReviews] = useState<AiReview[]>([]);
  const [waiters, setWaiters] = useState<AiWaiter[]>([]);
  const [menuItems, setMenuItems] = useState<AiMenuItem[]>([]);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);

    try {
      // 1. Active orders
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, guest_count, waiter_id')
        .eq('restaurant_id', restaurantId);

      // 2. Archived orders
      let archivedOrders: AiOrder[] = [];
      const { data: archO1, error: archO1Err } = await supabase.rpc('admin_get_orders_archive', { p_restaurant_id: restaurantId });
      if (!archO1Err) {
        archivedOrders = archO1 || [];
      } else if (isMissingRpc(archO1Err)) {
        const { data: archO2 } = await supabase.from('orders_archive').select('id, status, total_amount, created_at, guest_count, waiter_id').eq('restaurant_id', restaurantId);
        archivedOrders = archO2 || [];
      }

      const allOrders: AiOrder[] = [...(activeOrders || []), ...archivedOrders];
      setOrders(allOrders);

      const allOrderIds = allOrders.map(o => o.id);

      // 3. Payments (active + archived)
      let allPayments: AiPayment[] = [];
      if (allOrderIds.length > 0) {
        const { data: activePayments } = await supabase
          .from('payments')
          .select('order_id, amount, payment_method')
          .in('order_id', allOrderIds);

        let archivedPayments: AiPayment[] = [];
        const { data: archP1, error: archP1Err } = await supabase.rpc('admin_get_payments_archive', { p_restaurant_id: restaurantId });
        if (!archP1Err) {
          archivedPayments = (archP1 || []).filter((p: any) => allOrderIds.includes(p.order_id));
        } else if (isMissingRpc(archP1Err)) {
          const { data: archP2 } = await supabase.from('payments_archive').select('order_id, amount, payment_method').in('order_id', allOrderIds);
          archivedPayments = archP2 || [];
        }
        allPayments = [...(activePayments || []), ...archivedPayments];
      }
      setPayments(allPayments);

      // 4. Order items (via batches)
      let allItems: AiOrderItem[] = [];
      if (allOrderIds.length > 0) {
        // Get batches
        let allBatches: AiOrderBatch[] = [];
        const { data: activeBatches } = await supabase
          .from('order_batches')
          .select('id, order_id')
          .in('order_id', allOrderIds);

        let archivedBatches: AiOrderBatch[] = [];
        const { data: archB1, error: archB1Err } = await supabase.rpc('admin_get_order_batches_archive', { p_restaurant_id: restaurantId });
        if (!archB1Err) {
          archivedBatches = (archB1 || []).filter((b: any) => allOrderIds.includes(b.order_id));
        } else if (isMissingRpc(archB1Err)) {
          const { data: archB2 } = await supabase.from('order_batches_archive').select('id, order_id').in('order_id', allOrderIds);
          archivedBatches = archB2 || [];
        }
        allBatches = [...(activeBatches || []), ...archivedBatches];

        const allBatchIds = allBatches.map(b => b.id);
        if (allBatchIds.length > 0) {
          const { data: activeItems } = await supabase
            .from('order_items')
            .select('menu_item_id, name, quantity, batch_id')
            .in('batch_id', allBatchIds);

          let archivedItems: AiOrderItem[] = [];
          const { data: archI1, error: archI1Err } = await supabase.rpc('admin_get_order_items_archive', { p_restaurant_id: restaurantId });
          if (!archI1Err) {
            archivedItems = (archI1 || []).filter((i: any) => allBatchIds.includes(i.batch_id));
          } else if (isMissingRpc(archI1Err)) {
            const { data: archI2 } = await supabase.from('order_items_archive').select('menu_item_id, name, quantity, batch_id').in('batch_id', allBatchIds);
            archivedItems = archI2 || [];
          }
          allItems = [...(activeItems || []), ...archivedItems];
        }
      }
      setOrderItems(allItems);

      // 5. Reviews (active + archived)
      const { data: activeReviews } = await supabase
        .from('reviews')
        .select('id, restaurant_rating, waiter_rating, comment, waiter_id, created_at')
        .eq('restaurant_id', restaurantId);

      const { data: archivedReviews } = await supabase
        .from('reviews_archive')
        .select('id, restaurant_rating, waiter_rating, comment, waiter_id, created_at')
        .eq('restaurant_id', restaurantId);

      setReviews([...(activeReviews || []), ...(archivedReviews || [])]);

      // 6. Waiters
      const { data: waitersData } = await supabase
        .from('waiters')
        .select('id, nickname, full_name, profile_photo_url, average_rating, waiter_rating_count')
        .eq('restaurant_id', restaurantId);
      setWaiters(waitersData || []);

      // 7. Menu items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name, average_rating, rating_count, times_ordered')
        .eq('restaurant_id', restaurantId);
      setMenuItems(menuData || []);

    } catch (err) {
      console.error('Error en AiAnalysisPage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [CURRENT_RESTAURANT?.id]);

  // ─── Computed metrics ─────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const paidOrderIds = new Set(payments.map(p => p.order_id));
    const paidOrders = orders.filter(o => paidOrderIds.has(o.id));

    // Revenue
    const totalRevenue = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Orders count
    const totalOrders = orders.length;
    const paidOrderCount = paidOrders.length;

    // Ticket promedio
    const avgTicket = paidOrderCount > 0 ? totalRevenue / paidOrderCount : 0;

    // Comensales
    const totalGuests = orders.reduce((acc, o) => acc + (o.guest_count || 1), 0);

    // Score global
    const ratingsWithValue = reviews.filter(r => r.restaurant_rating != null);
    const globalScore = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((acc, r) => acc + Number(r.restaurant_rating), 0) / ratingsWithValue.length
      : null;

    // Mejor mes (por facturación)
    const revenueByMonth: Record<string, number> = {};
    payments.forEach(p => {
      const order = orders.find(o => o.id === p.order_id);
      if (!order) return;
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (Number(p.amount) || 0);
    });
    const bestMonthKey = Object.keys(revenueByMonth).sort((a, b) => revenueByMonth[b] - revenueByMonth[a])[0];
    let bestMonth: string | null = null;
    let bestMonthRevenue = 0;
    if (bestMonthKey) {
      const [year, month] = bestMonthKey.split('-').map(Number);
      bestMonth = `${MONTHS_ES[month]} ${year}`;
      bestMonthRevenue = revenueByMonth[bestMonthKey];
    }

    // Métodos de pago
    const paymentMethods: Record<string, number> = {};
    payments.forEach(p => {
      const method = p.payment_method || 'Otro';
      paymentMethods[method] = (paymentMethods[method] || 0) + (Number(p.amount) || 0);
    });
    const sortedMethods = Object.entries(paymentMethods).sort((a, b) => b[1] - a[1]);

    // Mejor mesero (reviews con waiter_rating)
    const waiterRatings: Record<string, number[]> = {};
    reviews.forEach(r => {
      if (r.waiter_id && r.waiter_rating != null) {
        waiterRatings[r.waiter_id] = waiterRatings[r.waiter_id] || [];
        waiterRatings[r.waiter_id].push(Number(r.waiter_rating));
      }
    });

    const waiterAvgs = Object.entries(waiterRatings)
      .map(([id, ratings]) => ({ id, avg: ratings.reduce((a, b) => a + b, 0) / ratings.length, count: ratings.length }))
      .filter(w => w.count >= 3)
      .sort((a, b) => b.avg - a.avg);

    const bestWaiterId = waiterAvgs[0]?.id ?? null;
    const worstWaiterId = waiterAvgs[waiterAvgs.length - 1]?.id ?? null;
    const bestWaiter = waiters.find(w => w.id === bestWaiterId) ?? null;
    const worstWaiter = waiterAvgs.length > 1 ? (waiters.find(w => w.id === worstWaiterId) ?? null) : null;
    const bestWaiterAvg = waiterAvgs[0]?.avg ?? null;
    const worstWaiterAvg = waiterAvgs[waiterAvgs.length - 1]?.avg ?? null;

    // Producto más vendido (por conteo de order_items)
    const itemCounts: Record<string, { name: string; qty: number }> = {};
    orderItems.forEach(item => {
      const key = item.menu_item_id || item.name;
      if (!itemCounts[key]) itemCounts[key] = { name: item.name, qty: 0 };
      itemCounts[key].qty += item.quantity || 1;
    });
    const topItem = Object.values(itemCounts).sort((a, b) => b.qty - a.qty)[0] ?? null;

    // Mejor plato por rating
    const ratedItems = menuItems.filter(m => m.rating_count != null && m.rating_count >= 3 && m.average_rating != null);
    const bestDish = ratedItems.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0))[0] ?? null;
    const worstDish = ratedItems.sort((a, b) => (a.average_rating ?? 0) - (b.average_rating ?? 0))[0] ?? null;

    return {
      totalRevenue, totalOrders, paidOrderCount, avgTicket, totalGuests,
      globalScore, globalScoreCount: ratingsWithValue.length,
      bestMonth, bestMonthRevenue,
      sortedMethods,
      bestWaiter, worstWaiter, bestWaiterAvg, worstWaiterAvg,
      topItem, bestDish, worstDish,
    };
  }, [orders, payments, orderItems, reviews, waiters, menuItems]);

  // ─── Recommendations ──────────────────────────────────────────────────────

  const recommendations = useMemo(() => {
    const recs: { type: 'success' | 'warning' | 'info'; title: string; body: string }[] = [];

    if (metrics.globalScore != null && metrics.globalScore < 3.5) {
      recs.push({ type: 'warning', title: 'Experiencia general por debajo del promedio', body: `El score global es ${metrics.globalScore.toFixed(1)}/5. Revisá los comentarios negativos para identificar puntos de mejora urgentes.` });
    }
    if (metrics.worstWaiter && metrics.worstWaiterAvg != null && metrics.worstWaiterAvg < 3.5) {
      recs.push({ type: 'warning', title: `Atención de ${metrics.worstWaiter.nickname || metrics.worstWaiter.full_name} necesita mejora`, body: `Rating promedio: ${metrics.worstWaiterAvg.toFixed(1)}/5. Considerá brindarle feedback o capacitación adicional.` });
    }
    if (metrics.avgTicket > 0 && metrics.avgTicket < 1000) {
      recs.push({ type: 'info', title: 'Oportunidad para incrementar ticket promedio', body: `El ticket promedio actual es $${formatNum(metrics.avgTicket)}. Podés impulsar combos o sugerencias de maridaje para aumentarlo.` });
    }
    if (metrics.bestDish) {
      recs.push({ type: 'success', title: `Destacá "${metrics.bestDish.name}" en el menú`, body: `Es tu plato mejor calificado (${metrics.bestDish.average_rating?.toFixed(1)}/5). Marcarlo como destacado puede atraer más pedidos.` });
    }
    if (metrics.worstDish && metrics.worstDish.id !== metrics.bestDish?.id && (metrics.worstDish.average_rating ?? 5) < 3.5) {
      recs.push({ type: 'warning', title: `Revisá "${metrics.worstDish.name}"`, body: `Rating ${metrics.worstDish.average_rating?.toFixed(1)}/5 con ${metrics.worstDish.rating_count} valoraciones. Considerá ajustar la receta o retirarlo del menú.` });
    }
    if (metrics.topItem) {
      recs.push({ type: 'success', title: `"${metrics.topItem.name}" es tu star producto`, body: `Se vendieron ${metrics.topItem.qty} unidades. Asegurate de tener siempre stock suficiente y de que esté visible en el menú.` });
    }
    if (recs.length === 0) {
      recs.push({ type: 'success', title: 'Todo en orden', body: 'No se detectaron alertas críticas. Seguí monitoreando las métricas regularmente.' });
    }
    return recs;
  }, [metrics]);

  // ─── Voz del cliente ──────────────────────────────────────────────────────

  const voiceAnalysis = useMemo(() => {
    const withComment = reviews.filter(r => r.comment && r.comment.trim().length > 0);
    if (withComment.length === 0) return null;

    const themeCounts: Record<keyof typeof THEMES, number> = { atencion: 0, comida: 0, rapidez: 0, ambiente: 0, precio: 0 };

    const analyzed = withComment.map(r => {
      const text = (r.comment || '').toLowerCase();
      const posScore = POSITIVE_WORDS.filter(w => text.includes(w)).length;
      const negScore = NEGATIVE_WORDS.filter(w => text.includes(w)).length;
      const sentiment: 'positive' | 'negative' | 'neutral' =
        posScore > negScore ? 'positive' : negScore > posScore ? 'negative' : 'neutral';

      const detectedThemes: string[] = [];
      (Object.keys(THEMES) as (keyof typeof THEMES)[]).forEach(theme => {
        if (THEMES[theme].some(kw => text.includes(kw))) {
          detectedThemes.push(theme);
          themeCounts[theme]++;
        }
      });

      return { ...r, sentiment, detectedThemes, posScore, negScore };
    });

    const positive = analyzed.filter(r => r.sentiment === 'positive');
    const negative = analyzed.filter(r => r.sentiment === 'negative');
    const neutral = analyzed.filter(r => r.sentiment === 'neutral');

    const sortedThemes = (Object.keys(themeCounts) as (keyof typeof THEMES)[])
      .filter(k => themeCounts[k] > 0)
      .sort((a, b) => themeCounts[b] - themeCounts[a]);

    const themeLabels: Record<string, string> = {
      atencion: 'Atención', comida: 'Comida', rapidez: 'Rapidez', ambiente: 'Ambiente', precio: 'Precio'
    };

    // Summary heuristic
    let summary = '';
    const pct = Math.round((positive.length / analyzed.length) * 100);
    if (pct >= 75) summary = `La mayoría de tus clientes (${pct}%) están muy satisfechos con la experiencia.`;
    else if (pct >= 50) summary = `Más de la mitad de los clientes (${pct}%) tienen una experiencia positiva, pero hay margen de mejora.`;
    else summary = `Solo el ${pct}% de los comentarios son positivos. Es momento de revisar los procesos con más atención.`;

    if (sortedThemes.length > 0) {
      const topTheme = themeLabels[sortedThemes[0]];
      summary += ` El tema más mencionado es "${topTheme}".`;
    }

    return { total: analyzed.length, positive, negative, neutral, themeCounts, sortedThemes, themeLabels, summary };
  }, [reviews]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatNum = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatCurrency = (n: number) => `$${formatNum(n)}`;

  const StatCard = ({ icon: Icon, label, value, sub, color = 'indigo' }: { icon: any; label: string; value: string; sub?: string; color?: string }) => {
    const colorMap: Record<string, string> = {
      indigo: 'bg-indigo-50 text-indigo-600',
      amber: 'bg-amber-50 text-amber-600',
      green: 'bg-green-50 text-green-600',
      blue: 'bg-blue-50 text-blue-600',
      purple: 'bg-purple-50 text-purple-600',
      rose: 'bg-rose-50 text-rose-600',
    };
    return (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
        <div className={`p-2.5 rounded-xl shrink-0 ${colorMap[color] || colorMap.indigo}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Analizando datos históricos…
      </div>
    );
  }

  if (!CURRENT_RESTAURANT?.id) {
    return (
      <div className="p-6 text-gray-400 text-center">Sin restaurante configurado.</div>
    );
  }

  const noData = orders.length === 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
            <BrainCircuit size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Análisis AI</h1>
            <p className="text-sm text-gray-500 mt-0.5">Métricas históricas + inteligencia sobre tu negocio</p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-xl px-3 py-2 transition-colors"
        >
          <RefreshCw size={15} />
          Actualizar
        </button>
      </div>

      {noData ? (
        <div className="text-center py-20 text-gray-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Aún no hay datos suficientes para analizar.</p>
          <p className="text-sm mt-1">Una vez que tengas órdenes registradas, los análisis aparecerán aquí.</p>
        </div>
      ) : (
        <>
          {/* ── Métricas principales ── */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Métricas históricas</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={DollarSign} label="Facturación total" value={formatCurrency(metrics.totalRevenue)} sub={`${metrics.paidOrderCount} órdenes pagadas`} color="green" />
              <StatCard icon={ShoppingBag} label="Total pedidos" value={formatNum(metrics.totalOrders)} color="indigo" />
              <StatCard icon={TrendingUp} label="Ticket promedio" value={formatCurrency(metrics.avgTicket)} sub="por orden pagada" color="blue" />
              <StatCard icon={Users} label="Comensales totales" value={formatNum(metrics.totalGuests)} color="purple" />
              {metrics.globalScore != null && (
                <StatCard
                  icon={Star}
                  label="Score global"
                  value={`${metrics.globalScore.toFixed(1)} / 5`}
                  sub={`${metrics.globalScoreCount} valoraciones`}
                  color={metrics.globalScore >= 4 ? 'green' : metrics.globalScore >= 3 ? 'amber' : 'rose'}
                />
              )}
              {metrics.bestMonth && (
                <StatCard icon={Calendar} label="Mejor mes" value={metrics.bestMonth} sub={formatCurrency(metrics.bestMonthRevenue)} color="amber" />
              )}
            </div>
          </section>

          {/* ── Métodos de pago ── */}
          {metrics.sortedMethods.length > 0 && (
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Métodos de pago</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                {metrics.sortedMethods.map(([method, amount]) => {
                  const pct = metrics.totalRevenue > 0 ? (amount / metrics.totalRevenue) * 100 : 0;
                  return (
                    <div key={method}>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="font-medium text-gray-700 capitalize">{method}</span>
                        <span className="text-gray-500">{formatCurrency(amount)} <span className="text-gray-400 text-xs">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Meseros ── */}
          {(metrics.bestWaiter || metrics.worstWaiter) && (
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Equipo de sala</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.bestWaiter && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="relative shrink-0">
                      {metrics.bestWaiter.profile_photo_url ? (
                        <img src={metrics.bestWaiter.profile_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
                          {(metrics.bestWaiter.nickname || metrics.bestWaiter.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <Award size={10} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Mejor mesero</p>
                      <p className="font-bold text-gray-900">{metrics.bestWaiter.nickname || metrics.bestWaiter.full_name}</p>
                      <p className="text-sm text-green-600 font-semibold">{metrics.bestWaiterAvg?.toFixed(1)} ★</p>
                    </div>
                  </div>
                )}
                {metrics.worstWaiter && metrics.worstWaiter.id !== metrics.bestWaiter?.id && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                    <div className="relative shrink-0">
                      {metrics.worstWaiter.profile_photo_url ? (
                        <img src={metrics.worstWaiter.profile_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-lg">
                          {(metrics.worstWaiter.nickname || metrics.worstWaiter.full_name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5">
                        <Zap size={10} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">A seguir de cerca</p>
                      <p className="font-bold text-gray-900">{metrics.worstWaiter.nickname || metrics.worstWaiter.full_name}</p>
                      <p className="text-sm text-amber-600 font-semibold">{metrics.worstWaiterAvg?.toFixed(1)} ★</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Platos destacados ── */}
          {(metrics.topItem || metrics.bestDish || metrics.worstDish) && (
            <section>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Platos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {metrics.topItem && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ChefHat size={16} className="text-indigo-500" />
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Más vendido</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{metrics.topItem.name}</p>
                    <p className="text-indigo-600 font-semibold mt-1">{metrics.topItem.qty} unidades</p>
                  </div>
                )}
                {metrics.bestDish && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsUp size={16} className="text-green-500" />
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Mejor calificado</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{metrics.bestDish.name}</p>
                    <p className="text-green-600 font-semibold mt-1">{metrics.bestDish.average_rating?.toFixed(1)} ★ ({metrics.bestDish.rating_count} votos)</p>
                  </div>
                )}
                {metrics.worstDish && metrics.worstDish.id !== metrics.bestDish?.id && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ThumbsDown size={16} className="text-rose-500" />
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Peor calificado</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{metrics.worstDish.name}</p>
                    <p className="text-rose-600 font-semibold mt-1">{metrics.worstDish.average_rating?.toFixed(1)} ★ ({metrics.worstDish.rating_count} votos)</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Recomendaciones ── */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Recomendaciones</h2>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const styles = {
                  success: { bg: 'bg-green-50 border-green-100', icon: 'text-green-500', title: 'text-green-800' },
                  warning: { bg: 'bg-amber-50 border-amber-100', icon: 'text-amber-500', title: 'text-amber-800' },
                  info: { bg: 'bg-blue-50 border-blue-100', icon: 'text-blue-500', title: 'text-blue-800' },
                };
                const s = styles[rec.type];
                const Icon = rec.type === 'success' ? TrendingUp : rec.type === 'warning' ? AlertTriangle : BrainCircuit;
                return (
                  <div key={i} className={`rounded-2xl border p-4 flex gap-3 ${s.bg}`}>
                    <Icon size={18} className={`shrink-0 mt-0.5 ${s.icon}`} />
                    <div>
                      <p className={`font-semibold text-sm ${s.title}`}>{rec.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{rec.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Voz del cliente ── */}
          <section>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Voz del cliente</h2>

            {!voiceAnalysis ? (
              <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aún no hay comentarios escritos.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Resumen */}
                <div className="bg-indigo-600 text-white rounded-2xl p-5">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">Resumen general</p>
                  <p className="text-base leading-relaxed">{voiceAnalysis.summary}</p>
                  <div className="flex gap-5 mt-4 text-sm">
                    <span className="flex items-center gap-1.5"><ThumbsUp size={14} className="opacity-70" /> {voiceAnalysis.positive.length} positivos</span>
                    <span className="flex items-center gap-1.5"><ThumbsDown size={14} className="opacity-70" /> {voiceAnalysis.negative.length} negativos</span>
                    <span className="text-white/60">{voiceAnalysis.neutral.length} neutros</span>
                  </div>
                </div>

                {/* Temas */}
                {voiceAnalysis.sortedThemes.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Temas más mencionados</p>
                    <div className="space-y-3">
                      {voiceAnalysis.sortedThemes.map(theme => {
                        const count = voiceAnalysis.themeCounts[theme as keyof typeof THEMES];
                        const pct = (count / voiceAnalysis.total) * 100;
                        return (
                          <div key={theme}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">{voiceAnalysis.themeLabels[theme]}</span>
                              <span className="text-gray-400">{count} menciones</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Comentarios destacados */}
                {voiceAnalysis.positive.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <ThumbsUp size={13} /> Comentarios destacados
                    </p>
                    <div className="space-y-3">
                      {voiceAnalysis.positive.slice(0, 5).map(r => (
                        <div key={r.id} className="bg-white rounded-2xl border border-green-100 p-4">
                          <p className="text-sm text-gray-700 leading-relaxed">"{r.comment}"</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            {r.restaurant_rating != null && <span>⭐ {r.restaurant_rating}/5</span>}
                            <span>{new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comentarios a revisar */}
                {voiceAnalysis.negative.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Comentarios a revisar
                    </p>
                    <div className="space-y-3">
                      {voiceAnalysis.negative.slice(0, 5).map(r => (
                        <div key={r.id} className="bg-white rounded-2xl border border-rose-100 p-4">
                          <p className="text-sm text-gray-700 leading-relaxed">"{r.comment}"</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            {r.restaurant_rating != null && <span>⭐ {r.restaurant_rating}/5</span>}
                            <span>{new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AiAnalysisPage;
