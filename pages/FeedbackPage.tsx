import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, MessageSquareQuote, TrendingUp, Users, Utensils, 
  Clock, ArrowUpRight, ArrowDownRight, User, Loader2, AlertCircle,
  Trophy, MessageCircle, BarChart3, AlertTriangle, ChevronRight, CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';

interface Review {
  id: string;
  restaurant_rating: number;
  waiter_rating: number;
  comment: string;
  created_at: string;
  waiter_id: string;
  waiters: {
    nickname: string;
    profile_photo_url: string;
  } | null;
}

interface RankedItem {
  plato_nombre: string;
  promedio: number;
  total_votos: number;
}

interface RankedWaiter {
  id: string;
  nickname: string;
  full_name: string;
  profile_photo_url: string;
  average_rating: number;
}

const FeedbackPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rankedItems, setRankedItems] = useState<RankedItem[]>([]);
  const [rankedWaiters, setRankedWaiters] = useState<RankedWaiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    avgRestaurant: 0,
    totalReviews: 0
  });

  useEffect(() => {
    fetchFeedbackData();
    
    // Suscripción en tiempo real para refrescar datos ante nuevas reseñas
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reviews' },
        () => {
          console.log("Nueva reseña detectada, actualizando rankings...");
          fetchFeedbackData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedbackData = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) return;

    try {
      // 1. Reseñas recientes para el Muro de Comentarios
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('*, waiters(nickname, profile_photo_url)')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (reviewData) setReviews(reviewData as any);

      // 2. Ranking de Staff (desde reviews; fallback a waiters.average_rating si no hay reviews con rating)
      const { data: waitersBase } = await supabase
        .from('waiters')
        .select('id, nickname, full_name, profile_photo_url, average_rating')
        .eq('restaurant_id', restaurantId);

      const { data: waiterReviews } = await supabase
        .from('reviews')
        .select('waiter_id, waiter_rating')
        .eq('restaurant_id', restaurantId);

      if (waitersBase && waiterReviews) {
        const waiterStats = waitersBase.map(w => {
          // Solo reseñas con waiter_rating válido (no null, no vacío)
          const reviewsForW = waiterReviews.filter(
            r => r.waiter_id === w.id && r.waiter_rating != null && r.waiter_rating !== ''
          );
          let avg: number;
          if (reviewsForW.length > 0) {
            const sum = reviewsForW.reduce((acc, curr) => acc + (Number(curr.waiter_rating) || 0), 0);
            avg = sum / reviewsForW.length;
          } else {
            // Fallback: usar average_rating de waiters (lo actualiza syncWaiterStats en guests)
            avg = Number(w.average_rating) || 0;
          }
          return {
            ...w,
            average_rating: Math.round(avg * 10) / 10
          };
        }).sort((a, b) => b.average_rating - a.average_rating);

        setRankedWaiters(waiterStats);
      }

      // 3. Estadísticas Generales del Local
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('restaurant_rating')
        .eq('restaurant_id', restaurantId);

      if (allReviews && allReviews.length > 0) {
        const totalRest = allReviews.reduce((acc, r) => acc + r.restaurant_rating, 0);
        setStats({
          avgRestaurant: totalRest / allReviews.length,
          totalReviews: allReviews.length
        });
      }

      // 4. Ranking de Platos desde la vista 'platos_rating_summary' (Consulta Directa)
      const { data: dishData, error: dishError } = await supabase
        .from('platos_rating_summary')
        .select('*')
        .eq('restaurant_id', restaurantId);

      // Verificación de datos recibidos (RLS Check)
      console.log("DEBUG: Datos platos_rating_summary:", dishData, dishError);

      if (dishData) {
        setRankedItems(dishData);
      }

    } catch (err) {
      console.error("Error al cargar feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  // Clasificación en frontend según umbrales solicitados (Favorites >= 4.0, Improvements < 3.5)
  const topDishes = useMemo(() => 
    rankedItems
      .filter(item => item.promedio >= 4.0)
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 10), 
  [rankedItems]);

  const bottomDishes = useMemo(() => 
    rankedItems
      .filter(item => item.promedio < 3.5)
      .sort((a, b) => a.promedio - b.promedio)
      .slice(0, 10), 
  [rankedItems]);

  const renderStars = (rating: number, size = 14) => {
    const r = Number(rating) || 0;
    const filled = Math.min(5, Math.round(r));
    return (
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={size}
            fill={i < filled ? '#f59e0b' : 'none'}
            className={i < filled ? 'text-amber-500' : 'text-gray-200'}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Calculando métricas de calidad...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Análisis de Calidad</h1>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
            <BarChart3 size={14} className="text-indigo-600" />
            Control de estándares y satisfacción del cliente
          </p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Score Global</p>
              <div className="flex items-center gap-2">
                 <span className="text-2xl font-black text-gray-900">{stats.avgRestaurant.toFixed(1)}</span>
                 {renderStars(stats.avgRestaurant, 18)}
              </div>
           </div>
           <div className="w-px h-8 bg-gray-100"></div>
           <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Reviews</p>
              <p className="text-lg font-black text-indigo-600">{stats.totalReviews}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Columna Izquierda: Ranking de Staff (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="text-indigo-600" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest">Ranking de Staff</h2>
              </div>
              <span className="text-[9px] font-black text-indigo-400 uppercase">Tiempo Real</span>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[700px] custom-scrollbar">
              {rankedWaiters.map((waiter, index) => (
                <div key={waiter.id} className="group flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                       <div className={`w-12 h-12 rounded-xl border-2 overflow-hidden ${index === 0 ? 'border-amber-400' : 'border-gray-100'}`}>
                          <img src={waiter.profile_photo_url} className="w-full h-full object-cover" alt={waiter.nickname} />
                       </div>
                       {index < 3 && (
                         <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg ${index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'}`}>
                           {index + 1}
                         </div>
                       )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 tracking-tight">{waiter.nickname}</p>
                      <div className="flex items-center gap-2">
                        {renderStars(waiter.average_rating, 10)}
                        <span className="text-[10px] font-black text-indigo-600">{waiter.average_rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
              {rankedWaiters.length === 0 && (
                <div className="py-20 text-center text-gray-400 italic text-xs">No hay datos de staff aún</div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ranking de Menú (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
            {/* Top 10 Platos (Favoritos) */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="text-amber-500" size={20} />
                  <h2 className="text-sm font-black uppercase tracking-widest">Favoritos del Público</h2>
                </div>
                <span className="text-[10px] font-black text-amber-500 uppercase">Top 10 (≥ 4.0)</span>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar">
                {topDishes.map((item, index) => (
                  <div key={item.plato_nombre} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-l-4 border-amber-400 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 line-clamp-1">{item.plato_nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(item.promedio, 10)}
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{item.total_votos} reseñas</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-gray-900 ml-4">{item.promedio.toFixed(1)}</span>
                  </div>
                ))}
                {topDishes.length === 0 && (
                  <div className="py-20 text-center text-gray-400 italic text-sm">Sin datos suficientes</div>
                )}
              </div>
            </div>

            {/* Bottom 10 Platos (Oportunidades) */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-rose-500" size={20} />
                  <h2 className="text-sm font-black uppercase tracking-widest">Oportunidades de Mejora</h2>
                </div>
                <span className="text-[10px] font-black text-rose-500 uppercase">Debajo de 3.5</span>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar">
                {bottomDishes.map((item) => (
                  <div key={item.plato_nombre} className="flex items-center justify-between p-4 bg-rose-50/30 rounded-2xl border-l-4 border-rose-500 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900 line-clamp-1">{item.plato_nombre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(item.promedio, 10)}
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">{item.total_votos} reseñas</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-rose-600 ml-4">{item.promedio.toFixed(1)}</span>
                  </div>
                ))}
                {bottomDishes.length === 0 && rankedItems.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                    <CheckCircle2 size={32} className="text-emerald-400 mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">¡Todos tus platos superan el estándar!</p>
                  </div>
                )}
                {rankedItems.length === 0 && (
                  <div className="py-20 text-center text-gray-400 italic text-sm">Sin datos suficientes</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Muro de Comentarios (Voces de los Clientes) */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
         <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
               <MessageSquareQuote className="text-indigo-600" size={20} />
               <h2 className="text-xl font-black text-gray-900 tracking-tighter">Muro de Voces</h2>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Experiencia Real del Cliente</p>
         </div>
         
         <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto max-h-[800px] custom-scrollbar">
            {reviews.map(review => (
              <div key={review.id} className="flex flex-col bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg overflow-hidden bg-indigo-50 border border-indigo-100">
                          {review.waiters?.profile_photo_url ? (
                            <img src={review.waiters.profile_photo_url} className="w-full h-full object-cover" alt="W" />
                          ) : <User size={16} className="text-indigo-400" />}
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-gray-900">{review.waiters?.nickname || 'Staff'}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase">{new Date(review.created_at).toLocaleDateString('es-ES')}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <div className="flex items-center gap-1">
                          <Star size={10} fill="#f59e0b" className="text-amber-500" />
                          <span className="text-xs font-black text-gray-900">{review.restaurant_rating}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex-1">
                    <p className="text-sm italic text-gray-600 leading-relaxed mb-4">
                       {review.comment ? `"${review.comment}"` : <span className="text-gray-300 italic">Sin comentarios escritos</span>}
                    </p>
                 </div>

                 <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Satisfacción Local</span>
                    {renderStars(review.restaurant_rating, 10)}
                 </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                 <MessageCircle size={48} className="text-gray-100" />
                 <p className="text-gray-400 font-bold italic">Tu muro de voces está vacío. ¡Espera las primeras reseñas!</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default FeedbackPage;