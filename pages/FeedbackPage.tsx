import React, { useState, useEffect, useMemo } from 'react';
import { 
  Star, MessageSquareQuote, Users, Utensils, 
  User, Loader2, BarChart3, ChevronRight
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
  restaurant_id: string;
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
  waiter_rating_count?: number;
}

type FeedbackTab = 'staff' | 'dishes' | 'voices';

const FeedbackPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rankedItems, setRankedItems] = useState<RankedItem[]>([]);
  const [rankedWaiters, setRankedWaiters] = useState<RankedWaiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedbackTab>('staff');
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
      let waitersBase: any[] | null = null;
      const waitersWithCountResult = await supabase
        .from('waiters')
        .select('id, nickname, full_name, profile_photo_url, average_rating, waiter_rating_count')
        .eq('restaurant_id', restaurantId);

      if (waitersWithCountResult.error) {
        const waitersFallbackResult = await supabase
          .from('waiters')
          .select('id, nickname, full_name, profile_photo_url, average_rating')
          .eq('restaurant_id', restaurantId);

        waitersBase = waitersFallbackResult.data;
      } else {
        waitersBase = waitersWithCountResult.data;
      }

      const { data: activeWaiterReviews } = await supabase
        .from('reviews')
        .select('waiter_id, waiter_rating')
        .eq('restaurant_id', restaurantId);

      const { data: archivedWaiterReviews } = await supabase
        .from('reviews_archive')
        .select('waiter_id, waiter_rating')
        .eq('restaurant_id', restaurantId);

      if (waitersBase) {
        const waiterReviews = [
          ...(activeWaiterReviews || []),
          ...(archivedWaiterReviews || [])
        ];

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
            average_rating: Math.round(avg * 10) / 10,
            waiter_rating_count: reviewsForW.length || Number(w.waiter_rating_count) || 0
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

      // 4. Ranking de platos desde la vista consolidada de la base.
      const { data: dishData, error: dishError } = await supabase
        .from('platos_rating_summary')
        .select('restaurant_id, plato_nombre, promedio, total_votos')
        .eq('restaurant_id', restaurantId);

      if (dishError) {
        console.error('Error al cargar platos_rating_summary:', dishError);
      }

      setRankedItems((dishData || []) as RankedItem[]);

    } catch (err) {
      console.error("Error al cargar feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const dishRatings = useMemo(() => 
    [...rankedItems]
      .sort((a, b) => b.promedio - a.promedio), 
  [rankedItems]);

  const renderStars = (rating: number, size = 14, activeColor = '#f59e0b', activeClass = 'text-amber-500') => {
    const r = Number(rating) || 0;
    const filled = Math.min(5, Math.round(r));
    return (
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={size}
            fill={i < filled ? activeColor : 'none'}
            className={i < filled ? activeClass : 'text-gray-200'}
          />
        ))}
      </div>
    );
  };

  const getDishRatingStyles = (rating: number) => {
    if (rating >= 4) {
      return {
        cardClass: 'bg-emerald-50/50 border-l-4 border-emerald-500',
        reviewClass: 'text-emerald-600',
        scoreClass: 'text-emerald-700',
        starClass: 'text-emerald-500',
        starFill: '#10b981'
      };
    }

    if (rating >= 3) {
      return {
        cardClass: 'bg-amber-50/60 border-l-4 border-amber-400',
        reviewClass: 'text-amber-600',
        scoreClass: 'text-amber-700',
        starClass: 'text-amber-500',
        starFill: '#f59e0b'
      };
    }

    return {
      cardClass: 'bg-rose-50/40 border-l-4 border-rose-500',
      reviewClass: 'text-rose-500',
      scoreClass: 'text-rose-600',
      starClass: 'text-rose-500',
      starFill: '#f43f5e'
    };
  };

  const feedbackTabs: Array<{ id: FeedbackTab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = [
    { id: 'staff', label: 'Meseros', Icon: Users },
    { id: 'dishes', label: 'Platos', Icon: Utensils },
    { id: 'voices', label: 'Reseñas', Icon: MessageSquareQuote }
  ];

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

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-2">
        <div className="flex w-full gap-2">
          {feedbackTabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex flex-1 min-w-0 items-center justify-center gap-3 rounded-[1.5rem] px-3 sm:px-5 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'staff' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px] animate-in fade-in duration-300">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-indigo-600" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest">Ranking de Staff</h2>
            </div>
            <span className="text-[9px] font-black text-indigo-400 uppercase">Tiempo Real</span>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4 overflow-y-auto max-h-[700px] custom-scrollbar">
            {rankedWaiters.map((waiter, index) => (
              <div key={waiter.id} className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
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
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-400">
                        {waiter.waiter_rating_count || 0} {(waiter.waiter_rating_count || 0) === 1 ? 'calificación' : 'calificaciones'}
                      </span>
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
      )}

      {activeTab === 'dishes' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Utensils className="text-indigo-600" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest">Calificación Platos</h2>
            </div>
            <span className="text-[10px] font-black text-indigo-600 uppercase">{dishRatings.length} platos rankeados</span>
          </div>
          <div className="p-6 grid grid-cols-1 gap-4 overflow-y-auto max-h-[700px] custom-scrollbar">
            {dishRatings.map((item) => {
              const styles = getDishRatingStyles(Number(item.promedio) || 0);

              return (
                <div key={`${item.restaurant_id}-${item.plato_nombre}`} className={`flex items-center justify-between p-4 rounded-2xl hover:shadow-md transition-shadow ${styles.cardClass}`}>
                  <div className="flex-1">
                    <p className="text-xs font-black text-gray-900 line-clamp-1">{item.plato_nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(item.promedio, 10, styles.starFill, styles.starClass)}
                      <span className={`text-[10px] font-bold uppercase tracking-tighter ${styles.reviewClass}`}>
                        {item.total_votos} {item.total_votos === 1 ? 'calificación' : 'calificaciones'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-black ml-4 ${styles.scoreClass}`}>{item.promedio.toFixed(1)}</span>
                </div>
              );
            })}
            {dishRatings.length === 0 && (
              <div className="py-20 text-center text-gray-400 italic text-sm">Sin datos suficientes</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'voices' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
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
      )}
    </div>
  );
};

export default FeedbackPage;
