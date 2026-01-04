
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  DollarSign, Receipt, Utensils, TrendingUp, Loader2, Calendar, 
  LayoutDashboard, ShoppingBag, Clock, Users 
} from 'lucide-react';
import { CURRENT_RESTAURANT } from '../types';

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'historical';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ dishes: 0, orders: 0, sales: 0, historicalSales: 0 });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace('CLP', '$').trim();
  };

  const fetchStats = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) return;

    setLoading(true);
    try {
      // 1. Conteo de platos
      const { count: dishCount } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);

      // 2. Ventas Históricas
      const { data: histData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'Pagado');
      
      const historicalTotal = histData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

      // 3. Ventas por Rango de Tiempo
      let query = supabase.from('orders').select('total_amount').eq('restaurant_id', restaurantId).eq('status', 'Pagado');
      
      const now = new Date();
      if (timeRange === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (timeRange === 'monthly') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        query = query.gte('created_at', monthAgo.toISOString());
      } else if (timeRange === 'yearly') {
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        query = query.gte('created_at', yearAgo.toISOString());
      }

      const { data: ordersData } = await query;
      
      const rangeSales = ordersData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
      const totalOrders = ordersData?.length || 0;

      setStats({
        dishes: dishCount || 0,
        orders: totalOrders,
        sales: rangeSales,
        historicalSales: historicalTotal
      });
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentageOfHistorical = () => {
    if (stats.historicalSales === 0) return 0;
    return ((stats.sales / stats.historicalSales) * 100).toFixed(1);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <LayoutDashboard size={24} />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Resumen de Operación</h1>
          </div>
          <p className="text-gray-500 font-medium">Métricas de rendimiento y salud de tu negocio</p>
        </div>

        <div className="bg-white p-1 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
          {(['weekly', 'monthly', 'yearly', 'historical'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                timeRange === range ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              {range === 'weekly' ? 'Semana' : range === 'monthly' ? 'Mes' : range === 'yearly' ? 'Año' : 'Histórico'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card Facturación */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <DollarSign size={80} className="text-emerald-600" />
          </div>
          <div className="relative">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Facturación (Pagado)
            </p>
            {loading ? (
              <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-lg"></div>
            ) : (
              <div className="flex flex-col">
                <span className="text-4xl font-black text-gray-900 tracking-tighter">
                  {formatCurrency(stats.sales)}
                </span>
                {timeRange !== 'historical' && (
                  <div className="flex items-center gap-1.5 mt-2 text-emerald-600 font-bold text-xs">
                    <TrendingUp size={14} />
                    <span>{getPercentageOfHistorical()}% del total histórico</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card Pedidos */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="relative group">
            <div className="absolute top-0 right-0 opacity-5">
               <ShoppingBag size={60} className="text-indigo-600" />
            </div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Volumen de Pedidos</p>
            <div className="flex items-end gap-3">
              {loading ? (
                <div className="h-10 w-16 bg-gray-100 animate-pulse rounded-lg"></div>
              ) : (
                <span className="text-5xl font-black text-gray-900 tracking-tighter">{stats.orders}</span>
              )}
              <Receipt className="text-indigo-200 mb-2" size={24} />
            </div>
          </div>
        </div>

        {/* Card Platos */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="relative group">
             <div className="absolute top-0 right-0 opacity-5">
               <Utensils size={60} className="text-amber-600" />
            </div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Platos en Menú</p>
            <div className="flex items-end gap-3">
              {loading ? (
                <div className="h-10 w-16 bg-gray-100 animate-pulse rounded-lg"></div>
              ) : (
                <span className="text-5xl font-black text-gray-900 tracking-tighter">{stats.dishes}</span>
              )}
              <Utensils className="text-amber-200 mb-2" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Atención al Cliente</h3>
              <Users size={20} className="text-indigo-600" />
           </div>
           <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-2xl flex items-center justify-center">
                 <Clock size={32} />
              </div>
              <div>
                <p className="text-gray-900 font-bold">Módulo de análisis de tiempo promedio</p>
                <p className="text-xs text-gray-400">Disponible próximamente para planes Premium</p>
              </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Popularidad</h3>
              <TrendingUp size={20} className="text-emerald-600" />
           </div>
           <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-400 rounded-2xl flex items-center justify-center">
                 <Utensils size={32} />
              </div>
              <div>
                <p className="text-gray-900 font-bold">Top 5 platos más vendidos</p>
                <p className="text-xs text-gray-400">Basado en el volumen de comandas actual</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
