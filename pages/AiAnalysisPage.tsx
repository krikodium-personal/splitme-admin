import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';
import {
  BrainCircuit, TrendingUp, Users, Star, ShoppingBag, DollarSign,
  Award, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown, Loader2,
  Calendar, ChefHat, Zap, BarChart3, RefreshCw, Sparkles
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

// ─── NLP config ──────────────────────────────────────────────────────────────

const POSITIVE_WORDS = [
  'excelente', 'increíble', 'increible', 'delicioso', 'deliciosa', 'rápido', 'rapido',
  'amable', 'atento', 'atenta', 'perfecto', 'perfecta', 'buenísimo', 'buenisimo',
  'rico', 'rica', 'riquísimo', 'riquísima', 'rique', 'espectacular', 'recomiendo',
  'maravilloso', 'maravillosa', 'genial', 'bueno', 'buena', 'bien', 'encantó',
  'encanto', 'impresionante', 'satisfecho', 'satisfecha', 'encantado', 'encantada',
  'fantástico', 'fantastico', 'sabroso', 'sabrosa', 'fresco', 'fresca', 'puntual',
  'agradable', 'top', 'buen', 'recomendable', 'me encantó', 'muy bueno', 'que lindo',
];

const NEGATIVE_WORDS = [
  'malo', 'mala', 'tarde', 'lento', 'lenta', 'frío', 'frio', 'salado', 'salada',
  'crudo', 'cruda', 'espera', 'demoró', 'demoro', 'demora', 'error', 'equivocado',
  'equivocada', 'desagradable', 'pésimo', 'pesimo', 'horrible', 'asco', 'sucio',
  'sucia', 'caro', 'cara', 'defraudó', 'decepcion', 'decepcio', 'mal', 'faltó',
  'falto', 'olvidó', 'olvido', 'peor', 'problema', 'queja', 'raro', 'insípido',
  'insipido', 'aguado', 'regular', 'mejorar', 'pobre', 'seco', 'seca',
];

const THEMES: Record<string, string[]> = {
  atencion: ['mesero', 'mesera', 'atención', 'atencion', 'servicio', 'trato', 'amable', 'amabilidad', 'educado', 'educada', 'sonrió', 'ayudó', 'ayudo', 'atento', 'atenta'],
  comida:   ['comida', 'plato', 'sabor', 'rico', 'rica', 'delicioso', 'deliciosa', 'fresco', 'fresca', 'cocina', 'ingredientes', 'porción', 'porcion', 'calidad', 'menú', 'menu', 'riquísimo'],
  rapidez:  ['rápido', 'rapido', 'lento', 'lenta', 'espera', 'tardó', 'tardo', 'tiempo', 'demora', 'demoró', 'demoro', 'ágil', 'agil', 'eficiente'],
  ambiente: ['ambiente', 'lugar', 'limpio', 'limpia', 'sucio', 'sucia', 'música', 'musica', 'decoración', 'decoracion', 'tranquilo', 'tranquila', 'cómodo', 'comodo', 'mesa'],
  precio:   ['precio', 'barato', 'barata', 'caro', 'cara', 'vale', 'cuesta', 'paga', 'económico', 'economico', 'relación'],
};

const THEME_LABELS: Record<string, string> = {
  atencion: 'Atención', comida: 'Comida', rapidez: 'Rapidez', ambiente: 'Ambiente', precio: 'Precio',
};

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const isMissingRpc = (e: any) =>
  e?.code === 'PGRST202' || e?.message?.includes('Could not find the function');


// ─── Component ────────────────────────────────────────────────────────────────

const AiAnalysisPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AiOrder[]>([]);
  const [payments, setPayments] = useState<AiPayment[]>([]);
  const [reviews, setReviews] = useState<AiReview[]>([]);
  const [waiters, setWaiters] = useState<AiWaiter[]>([]);
  const [menuItems, setMenuItems] = useState<AiMenuItem[]>([]);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) { setLoading(false); return; }
    setLoading(true);

    try {
      // Orders: active + archived
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id, status, total_amount, created_at, guest_count, waiter_id')
        .eq('restaurant_id', restaurantId);

      let archivedOrders: AiOrder[] = [];
      const { data: archO, error: archOErr } = await supabase.rpc('admin_get_orders_archive', { p_restaurant_id: restaurantId });
      if (!archOErr) {
        archivedOrders = archO || [];
      } else if (isMissingRpc(archOErr)) {
        const { data: archOFallback } = await supabase.from('orders_archive').select('id, status, total_amount, created_at, guest_count, waiter_id').eq('restaurant_id', restaurantId);
        archivedOrders = archOFallback || [];
      }

      const allOrders: AiOrder[] = [...(activeOrders || []), ...archivedOrders];
      setOrders(allOrders);
      const allOrderIds = allOrders.map(o => o.id);

      // Payments: active + archived
      let allPayments: AiPayment[] = [];
      if (allOrderIds.length > 0) {
        const { data: activePay } = await supabase
          .from('payments')
          .select('order_id, amount, payment_method')
          .in('order_id', allOrderIds);

        let archivedPay: AiPayment[] = [];
        const { data: archP, error: archPErr } = await supabase.rpc('admin_get_payments_archive', { p_restaurant_id: restaurantId });
        if (!archPErr) {
          archivedPay = (archP || []).filter((p: any) => allOrderIds.includes(p.order_id));
        } else if (isMissingRpc(archPErr)) {
          const { data: archPFallback } = await supabase.from('payments_archive').select('order_id, amount, payment_method').in('order_id', allOrderIds);
          archivedPay = archPFallback || [];
        }
        allPayments = [...(activePay || []), ...archivedPay];
      }
      setPayments(allPayments);

      // Reviews: active + archived
      const { data: activeReviews } = await supabase
        .from('reviews')
        .select('id, restaurant_rating, waiter_rating, comment, waiter_id, created_at')
        .eq('restaurant_id', restaurantId);
      const { data: archivedReviews } = await supabase
        .from('reviews_archive')
        .select('id, restaurant_rating, waiter_rating, comment, waiter_id, created_at')
        .eq('restaurant_id', restaurantId);
      setReviews([...(activeReviews || []), ...(archivedReviews || [])]);

      // Waiters
      const { data: waitersData } = await supabase
        .from('waiters')
        .select('id, nickname, full_name, profile_photo_url, average_rating, waiter_rating_count')
        .eq('restaurant_id', restaurantId);
      setWaiters(waitersData || []);

      // Menu items
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('id, name, average_rating, rating_count, times_ordered')
        .eq('restaurant_id', restaurantId);
      setMenuItems(menuData || []);

    } catch (err) {
      console.error('AiAnalysisPage error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [CURRENT_RESTAURANT?.id]);

  // ─── Metrics ──────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    // Closed/paid orders
    const closedOrders = orders.filter(o => {
      const s = String(o.status || '').toUpperCase();
      return s === 'PAGADO' || s === 'CERRADO';
    });
    const orderCount = closedOrders.length || orders.length;

    // Revenue: sum payments first; fallback to total_amount on orders
    const paymentTotal = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const orderFallbackTotal = closedOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    const revenue = paymentTotal > 0 ? paymentTotal : orderFallbackTotal;

    // Ticket promedio
    const avgTicket = orderCount > 0 ? revenue / orderCount : 0;

    // Comensales
    const totalGuests = orders.reduce((acc, o) => acc + (o.guest_count || 1), 0);
    const avgGuestsPerOrder = orderCount > 0 ? totalGuests / orderCount : 0;

    // Score global
    const ratingsWithValue = reviews.filter(r => r.restaurant_rating != null);
    const globalScore = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((acc, r) => acc + Number(r.restaurant_rating), 0) / ratingsWithValue.length
      : null;

    // Mejor mes
    const revenueByMonth: Record<string, number> = {};
    payments.forEach(p => {
      const order = orders.find(o => o.id === p.order_id);
      if (!order) return;
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      revenueByMonth[key] = (revenueByMonth[key] || 0) + (Number(p.amount) || 0);
    });
    // fallback: use total_amount if no payments
    if (Object.keys(revenueByMonth).length === 0) {
      closedOrders.forEach(o => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        revenueByMonth[key] = (revenueByMonth[key] || 0) + (Number(o.total_amount) || 0);
      });
    }
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

    // Ranking de meseros (min 3 reviews)
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

    const bestWaiter = waiterAvgs[0] ? (waiters.find(w => w.id === waiterAvgs[0].id) ?? null) : null;
    const worstWaiter = waiterAvgs.length > 1 ? (waiters.find(w => w.id === waiterAvgs[waiterAvgs.length - 1].id) ?? null) : null;
    const bestWaiterAvg = waiterAvgs[0]?.avg ?? null;
    const worstWaiterAvg = waiterAvgs.length > 1 ? waiterAvgs[waiterAvgs.length - 1].avg : null;

    // Producto estrella — rating primero, ventas como desempate
    const eligibleItems = menuItems.filter(m => (m.average_rating ?? 0) > 0 && (m.rating_count ?? 0) >= 1);
    const starItem = [...eligibleItems].sort((a, b) => {
      const ratingDiff = (b.average_rating ?? 0) - (a.average_rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.times_ordered ?? 0) - (a.times_ordered ?? 0);
    })[0] ?? null;
    const topItem = starItem
      ? { name: starItem.name, qty: starItem.times_ordered ?? 0, rating: starItem.average_rating ?? 0 }
      : null;

    // Mejor y peor plato por rating
    const ratedItems = [...menuItems].filter(m => (m.rating_count ?? 0) >= 3 && m.average_rating != null);
    ratedItems.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
    const bestDish = ratedItems[0] ?? null;
    const worstDish = ratedItems[ratedItems.length - 1] ?? null;

    return {
      revenue, orderCount, avgTicket, totalGuests, avgGuestsPerOrder,
      globalScore, globalScoreCount: ratingsWithValue.length,
      bestMonth, bestMonthRevenue,
      sortedMethods,
      bestWaiter, worstWaiter, bestWaiterAvg, worstWaiterAvg,
      topItem, bestDish, worstDish: worstDish?.id !== bestDish?.id ? worstDish : null,
    };
  }, [orders, payments, reviews, waiters, menuItems]);

  // ─── Voz del cliente ──────────────────────────────────────────────────────

  const customerVoice = useMemo(() => {
    const withComment = reviews.filter(r => r.comment && r.comment.trim().length > 0);
    if (withComment.length === 0) return null;

    const themeCounts: Record<string, number> = { atencion: 0, comida: 0, rapidez: 0, ambiente: 0, precio: 0 };

    const analyzed = withComment.map(r => {
      const text = (r.comment || '').toLowerCase();
      const posScore = POSITIVE_WORDS.filter(w => text.includes(w)).length;
      const negScore = NEGATIVE_WORDS.filter(w => text.includes(w)).length;
      const rating = r.restaurant_rating != null ? Number(r.restaurant_rating) : null;
      // Rating beats NLP when it's unambiguous (≤2 = negative, ≥4 with no keyword match = positive)
      const sentiment: 'positive' | 'negative' | 'neutral' =
        rating != null && rating <= 2 ? 'negative'
        : rating != null && rating >= 4 && posScore === 0 && negScore === 0 ? 'positive'
        : posScore > negScore ? 'positive'
        : negScore > posScore ? 'negative'
        : 'neutral';

      Object.keys(THEMES).forEach(theme => {
        if (THEMES[theme].some(kw => text.includes(kw))) themeCounts[theme]++;
      });

      return { ...r, sentiment };
    });

    const positive = analyzed.filter(r => r.sentiment === 'positive');
    const negative = analyzed.filter(r => r.sentiment === 'negative');
    const neutral = analyzed.filter(r => r.sentiment === 'neutral');

    const sortedThemes = Object.keys(themeCounts)
      .filter(k => themeCounts[k] > 0)
      .sort((a, b) => themeCounts[b] - themeCounts[a]);

    const focus = sortedThemes[0] ?? null;

    const pct = Math.round((positive.length / analyzed.length) * 100);
    let mood: 'good' | 'mixed' | 'bad';
    let summary: string;
    if (pct >= 75) { mood = 'good'; summary = `La mayoría de tus clientes (${pct}%) están muy satisfechos con la experiencia.`; }
    else if (pct >= 50) { mood = 'mixed'; summary = `Más de la mitad de los clientes (${pct}%) tienen una experiencia positiva, aunque hay margen de mejora.`; }
    else { mood = 'bad'; summary = `Solo el ${pct}% de los comentarios son positivos. Es momento de revisar los procesos con más atención.`; }

    if (focus) summary += ` El tema más mencionado es "${THEME_LABELS[focus]}".`;

    return {
      writtenCount: analyzed.length,
      positiveCount: positive.length,
      improvementCount: negative.length,
      mood,
      focus,
      sortedThemes,
      themeCounts,
      summary,
      highlights: positive.slice(0, 5),
      concerns: negative.slice(0, 5),
    };
  }, [reviews]);

  // ─── Recommendations ──────────────────────────────────────────────────────

  const recommendations = useMemo(() => {
    const recs: { type: 'success' | 'warning' | 'info'; title: string; body: string }[] = [];

    if (metrics.globalScore != null && metrics.globalScore >= 4.5) {
      recs.push({ type: 'success', title: 'La experiencia general está fuerte', body: `Score global de ${metrics.globalScore.toFixed(1)}/5. Aprovechá el buen momento para pedir reseñas en Google o redes sociales.` });
    }
    if (metrics.globalScore != null && metrics.globalScore < 3.5) {
      recs.push({ type: 'warning', title: 'Experiencia general por debajo del promedio', body: `Score de ${metrics.globalScore.toFixed(1)}/5. Revisá los comentarios negativos para identificar puntos de mejora urgentes.` });
    }
    if (metrics.bestWaiter) {
      recs.push({ type: 'success', title: `${metrics.bestWaiter.nickname || metrics.bestWaiter.full_name} tiene buenas prácticas para replicar`, body: `Rating promedio de ${metrics.bestWaiterAvg?.toFixed(1)}/5 en sala. Sus hábitos son un modelo para el resto del equipo.` });
    }
    if (metrics.worstWaiter && metrics.worstWaiterAvg != null && metrics.worstWaiterAvg < 3.5) {
      recs.push({ type: 'warning', title: `Oportunidad de coaching en sala`, body: `${metrics.worstWaiter.nickname || metrics.worstWaiter.full_name} tiene un rating de ${metrics.worstWaiterAvg.toFixed(1)}/5. Darle feedback específico puede mejorar la nota general del restaurante.` });
    }
    if (metrics.avgGuestsPerOrder >= 2.5) {
      recs.push({ type: 'info', title: 'La división de cuenta es parte central del uso', body: `Promedio de ${metrics.avgGuestsPerOrder.toFixed(1)} comensales por mesa. Asegurate de que el flujo de split sea rápido y sin fricciones.` });
    }
    if (metrics.bestDish) {
      recs.push({ type: 'success', title: `Destacá "${metrics.bestDish.name}" en el menú`, body: `Es tu plato mejor calificado (${metrics.bestDish.average_rating?.toFixed(1)}/5 con ${metrics.bestDish.rating_count} votos). Marcarlo como destacado puede impulsar más pedidos.` });
    }
    if (metrics.worstDish && (metrics.worstDish.average_rating ?? 5) < 3.5) {
      recs.push({ type: 'warning', title: `"${metrics.worstDish.name}" puede afectar la recompra`, body: `Rating de ${metrics.worstDish.average_rating?.toFixed(1)}/5 con ${metrics.worstDish.rating_count} valoraciones. Considerá ajustar la receta o retirarlo del menú.` });
    }
    if (customerVoice && customerVoice.improvementCount > 0) {
      const focusLabel = customerVoice.focus ? `El tema principal detectado es "${THEME_LABELS[customerVoice.focus]}".` : '';
      recs.push({ type: 'warning', title: `Hay ${customerVoice.improvementCount} comentario${customerVoice.improvementCount > 1 ? 's' : ''} con señal de mejora`, body: `Revisá la sección Voz del cliente para ver el detalle. ${focusLabel}` });
    }
    if (metrics.topItem) {
      recs.push({ type: 'info', title: `"${metrics.topItem.name}" es tu producto estrella`, body: `${metrics.topItem.qty} unidades vendidas con un rating de ${metrics.topItem.rating.toFixed(1)}/5. Asegurate de que esté siempre disponible y visible en el menú.` });
    }
    if (recs.length === 0) {
      recs.push({ type: 'success', title: 'Todo en orden', body: 'No se detectaron alertas críticas. Seguí monitoreando las métricas regularmente.' });
    }
    return recs;
  }, [metrics, customerVoice]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const fmtNum = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
  const fmtCurrency = (n: number) => `$${fmtNum(n)}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Analizando datos históricos…
      </div>
    );
  }
  if (!CURRENT_RESTAURANT?.id) {
    return <div className="p-6 text-gray-400 text-center">Sin restaurante configurado.</div>;
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
            <p className="text-sm text-gray-500 mt-0.5">Lectura ejecutiva de performance comercial, equipo y calidad</p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-xl px-3 py-2 transition-colors"
        >
          <RefreshCw size={15} />
          Recalcular
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
          {/* ── Resumen ejecutivo ── */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Resumen ejecutivo</span>
            </div>
            <p className="text-base leading-relaxed text-gray-100">
              El negocio acumula{' '}
              <span className="text-white font-semibold">{fmtNum(metrics.orderCount)} pedidos</span>,{' '}
              <span className="text-white font-semibold">{fmtCurrency(metrics.revenue)}</span> en facturación registrada
              {metrics.globalScore != null && (
                <> y un score de calidad de <span className="text-white font-semibold">{metrics.globalScore.toFixed(1)}/5</span></>
              )}.
              {metrics.bestMonth && (
                <> El mejor mes fue <span className="text-white font-semibold">{metrics.bestMonth}</span> con {fmtCurrency(metrics.bestMonthRevenue)}.</>
              )}
              {customerVoice && (
                <> {customerVoice.summary}</>
              )}
            </p>
          </div>

          {/* ── KPIs ── */}
          <section>
            <SectionTitle>Métricas históricas</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="Facturación histórica" value={fmtCurrency(metrics.revenue)} color="green" />
              <StatCard icon={ShoppingBag} label="Pedidos analizados" value={fmtNum(metrics.orderCount)} color="indigo" />
              <StatCard icon={TrendingUp} label="Ticket promedio" value={fmtCurrency(metrics.avgTicket)} color="blue" />
              <StatCard icon={Users} label="Comensales totales" value={fmtNum(metrics.totalGuests)} color="purple" />
            </div>
          </section>

          {/* ── Voz del cliente ── */}
          <section>
            <SectionTitle>Voz del cliente</SectionTitle>
            {!customerVoice ? (
              <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aún no hay comentarios escritos.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Topes */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900">{customerVoice.writtenCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Comentarios escritos</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{customerVoice.positiveCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Elogios</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 text-center">
                    <p className="text-2xl font-bold text-rose-500">{customerVoice.improvementCount}</p>
                    <p className="text-xs text-gray-400 mt-1">A revisar</p>
                  </div>
                </div>

                {/* Temas */}
                {customerVoice.sortedThemes.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Temas más mencionados</p>
                    <div className="space-y-3">
                      {customerVoice.sortedThemes.map(theme => {
                        const count = customerVoice.themeCounts[theme];
                        const pct = (count / customerVoice.writtenCount) * 100;
                        return (
                          <div key={theme}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">{THEME_LABELS[theme]}</span>
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

                {/* Comentarios: 2 columnas — negativos izquierda, positivos derecha */}
                {(customerVoice.highlights.length > 0 || customerVoice.concerns.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Quejas — izquierda */}
                    <div>
                      <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <AlertTriangle size={13} /> A revisar ({customerVoice.concerns.length})
                      </p>
                      {customerVoice.concerns.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-400">
                          Sin quejas registradas
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerVoice.concerns.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl border border-rose-100 p-4">
                              <p className="text-sm text-gray-700 leading-relaxed">"{r.comment}"</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                {r.restaurant_rating != null && <span>⭐ {r.restaurant_rating}/5</span>}
                                <span>{new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Elogios — derecha */}
                    <div>
                      <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <ThumbsUp size={13} /> Elogios ({customerVoice.highlights.length})
                      </p>
                      {customerVoice.highlights.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center text-sm text-gray-400">
                          Sin elogios registrados
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {customerVoice.highlights.map(r => (
                            <div key={r.id} className="bg-white rounded-2xl border border-green-100 p-4">
                              <p className="text-sm text-gray-700 leading-relaxed">"{r.comment}"</p>
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                {r.restaurant_rating != null && <span>⭐ {r.restaurant_rating}/5</span>}
                                <span>{new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── Acciones sugeridas ── */}
          <section>
            <SectionTitle>Acciones sugeridas</SectionTitle>
            <div className="space-y-3">
              {recommendations.map((rec, i) => {
                const styles = {
                  success: { bg: 'bg-green-50 border-green-100', icon: 'text-green-500', title: 'text-green-800' },
                  warning: { bg: 'bg-amber-50 border-amber-100', icon: 'text-amber-500', title: 'text-amber-800' },
                  info:    { bg: 'bg-blue-50 border-blue-100',   icon: 'text-blue-500',  title: 'text-blue-800' },
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

          {/* ── Comensales y pagos ── */}
          <section>
            <SectionTitle>Comensales y pagos</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <StatCard icon={Users} label="Promedio de comensales por orden" value={metrics.avgGuestsPerOrder.toFixed(1)} color="purple" />
              {metrics.globalScore != null && (
                <StatCard
                  icon={Star}
                  label="Score global del restaurante"
                  value={`${metrics.globalScore.toFixed(1)} / 5`}
                  sub={`${metrics.globalScoreCount} valoraciones`}
                  color={metrics.globalScore >= 4 ? 'green' : metrics.globalScore >= 3 ? 'amber' : 'rose'}
                />
              )}
              {metrics.bestMonth && (
                <StatCard icon={Calendar} label="Mejor mes" value={metrics.bestMonth} sub={fmtCurrency(metrics.bestMonthRevenue)} color="amber" />
              )}
            </div>

            {metrics.sortedMethods.length > 0 && (
              <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Métodos de pago</p>
                <div className="space-y-3">
                  {metrics.sortedMethods.map(([method, amount]) => {
                    const pct = metrics.revenue > 0 ? (amount / metrics.revenue) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="flex items-center justify-between mb-1 text-sm">
                          <span className="font-medium text-gray-700 capitalize">{method}</span>
                          <span className="text-gray-500">{fmtCurrency(amount)} <span className="text-gray-400 text-xs">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ── Personal ── */}
          {(metrics.bestWaiter || metrics.worstWaiter) && (
            <section>
              <SectionTitle>Personal</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {metrics.bestWaiter && (
                  <WaiterCard
                    waiter={metrics.bestWaiter}
                    avg={metrics.bestWaiterAvg}
                    label="Mejor mesero"
                    badgeIcon={<Award size={10} className="text-white" />}
                    badgeColor="bg-green-500"
                    ratingColor="text-green-600"
                  />
                )}
                {metrics.worstWaiter && metrics.worstWaiter.id !== metrics.bestWaiter?.id && (
                  <WaiterCard
                    waiter={metrics.worstWaiter}
                    avg={metrics.worstWaiterAvg}
                    label="A seguir de cerca"
                    badgeIcon={<Zap size={10} className="text-white" />}
                    badgeColor="bg-amber-500"
                    ratingColor="text-amber-600"
                  />
                )}
              </div>
            </section>
          )}

          {/* ── Productos ── */}
          {(metrics.topItem || metrics.bestDish || metrics.worstDish) && (
            <section>
              <SectionTitle>Productos</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {metrics.topItem && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ChefHat size={16} className="text-indigo-500" />
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Producto estrella</p>
                    </div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">{metrics.topItem.name}</p>
                    <p className="text-indigo-600 font-semibold mt-1">{metrics.topItem.qty} ventas · {metrics.topItem.rating.toFixed(1)} ★</p>
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
                {metrics.worstDish && (
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

          {/* ── Calidad ── */}
          {metrics.globalScore != null && (
            <section>
              <SectionTitle>Calidad</SectionTitle>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-5">
                  <div className="text-center shrink-0">
                    <p className={`text-5xl font-black ${metrics.globalScore >= 4 ? 'text-green-600' : metrics.globalScore >= 3 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {metrics.globalScore.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">de 5</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <div
                          key={star}
                          className={`flex-1 h-2 rounded-full ${star <= Math.round(metrics.globalScore!) ? (metrics.globalScore! >= 4 ? 'bg-green-500' : metrics.globalScore! >= 3 ? 'bg-amber-400' : 'bg-rose-400') : 'bg-gray-100'}`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">
                      Basado en <span className="font-semibold text-gray-700">{metrics.globalScoreCount}</span> valoraciones de clientes.{' '}
                      {metrics.globalScore >= 4.5 && 'Excelente.'}
                      {metrics.globalScore >= 4 && metrics.globalScore < 4.5 && 'Muy bueno.'}
                      {metrics.globalScore >= 3 && metrics.globalScore < 4 && 'Aceptable, hay margen de mejora.'}
                      {metrics.globalScore < 3 && 'Necesita atención urgente.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">{children}</h2>
);

const StatCard: React.FC<{ icon: any; label: string; value: string; sub?: string; color?: string }> = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    amber:  'bg-amber-50 text-amber-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    rose:   'bg-rose-50 text-rose-600',
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

const WaiterCard: React.FC<{ waiter: AiWaiter; avg: number | null; label: string; badgeIcon: React.ReactNode; badgeColor: string; ratingColor: string }> = ({ waiter, avg, label, badgeIcon, badgeColor, ratingColor }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className="relative shrink-0">
      {waiter.profile_photo_url ? (
        <img src={waiter.profile_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-lg">
          {(waiter.nickname || waiter.full_name || '?')[0].toUpperCase()}
        </div>
      )}
      <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 ${badgeColor}`}>{badgeIcon}</div>
    </div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="font-bold text-gray-900">{waiter.nickname || waiter.full_name}</p>
      {avg != null && <p className={`text-sm font-semibold ${ratingColor}`}>{avg.toFixed(1)} ★</p>}
    </div>
  </div>
);

export default AiAnalysisPage;
