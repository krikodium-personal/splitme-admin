
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  DollarSign, Receipt, Utensils, TrendingUp, Loader2, Calendar, 
  LayoutDashboard, ShoppingBag, Clock, Users, Trophy, Grid3X3
} from 'lucide-react';
import { CURRENT_RESTAURANT } from '../types';

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'historical';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ dishes: 0, orders: 0, sales: 0, historicalSales: 0 });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [popularDishes, setPopularDishes] = useState<Array<{menu_item_id: string, name: string, total_quantity: number}>>([]);
  const [popularDishesLoading, setPopularDishesLoading] = useState(true);
  const [averageServiceTime, setAverageServiceTime] = useState<number | null>(null);
  const [serviceTimeLoading, setServiceTimeLoading] = useState(true);
  const [occupancyLoading, setOccupancyLoading] = useState(true);
  const [tables, setTables] = useState<Array<{ id: string; table_number: string }>>([]);
  const [occupiedTableIds, setOccupiedTableIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStats();
    fetchPopularDishes();
    fetchAverageServiceTime();
  }, [timeRange]);

  useEffect(() => {
    fetchTableOccupancy();

    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) return;

    const channel = supabase
      .channel('dashboard-occupancy')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchTableOccupancy();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        fetchTableOccupancy();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [CURRENT_RESTAURANT?.id]);

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

      // 2. Ventas Históricas (desde tabla agregada para performance)
      // Intentar usar tabla agregada primero, fallback a eventos si no existe
      let historicalTotal = 0;
      let rangeSales = 0;
      let totalOrders = 0;
      
      console.log('📊 Dashboard - restaurantId:', restaurantId);
      console.log('📊 Dashboard - timeRange:', timeRange);
      
      try {
        // Intentar usar tabla agregada (más rápida)
        const { data: histSummary, error: histSummaryError } = await supabase
          .from('dashboard_daily_summary')
          .select('total_sales, total_orders')
          .eq('restaurant_id', restaurantId);
        
        console.log('📊 Dashboard - histSummary:', histSummary);
        console.log('📊 Dashboard - histSummaryError:', histSummaryError);
        
        if (histSummary && histSummary.length > 0) {
          // Usar tabla agregada
          historicalTotal = histSummary.reduce((acc, curr) => acc + (Number(curr.total_sales) || 0), 0);
          
          // Ventas por rango usando tabla agregada
          const now = new Date();
          let startDate: Date;
          
          if (timeRange === 'weekly') {
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          } else if (timeRange === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          } else if (timeRange === 'yearly') {
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          } else {
            startDate = new Date(0); // Historical = todo
          }
          
          let rangeQuery = supabase
            .from('dashboard_daily_summary')
            .select('total_sales, total_orders')
            .eq('restaurant_id', restaurantId);
          
          if (timeRange !== 'historical') {
            rangeQuery = rangeQuery.gte('summary_date', startDate.toISOString().split('T')[0]);
          }
          
          const { data: rangeSummary } = await rangeQuery;
          
          if (rangeSummary && rangeSummary.length > 0) {
            rangeSales = rangeSummary.reduce((acc, curr) => acc + (Number(curr.total_sales) || 0), 0);
            totalOrders = rangeSummary.reduce((acc, curr) => acc + (Number(curr.total_orders) || 0), 0);
            console.log('📊 Dashboard - Usando tabla agregada:', { rangeSales, totalOrders, rangeSummaryLength: rangeSummary.length });
          } else {
            console.log('📊 Dashboard - Tabla agregada vacía, haciendo fallback a eventos');
          }
        } else {
          // Fallback: usar eventos individuales si no existe tabla agregada
          console.log('📊 Dashboard - No hay datos en tabla agregada, usando eventos individuales');
          const { data: histData, error: histDataError } = await supabase
            .from('dashboard_order_events')
            .select('total_amount')
            .eq('restaurant_id', restaurantId);
          
          console.log('📊 Dashboard - histData (eventos):', histData);
          console.log('📊 Dashboard - histDataError:', histDataError);
          
          historicalTotal = histData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

          const now = new Date();
          let query = supabase
            .from('dashboard_order_events')
            .select('total_amount, closed_at')
            .eq('restaurant_id', restaurantId);
          
          if (timeRange === 'weekly') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            query = query.gte('closed_at', weekAgo.toISOString());
          } else if (timeRange === 'monthly') {
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            query = query.gte('closed_at', monthAgo.toISOString());
          } else if (timeRange === 'yearly') {
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            query = query.gte('closed_at', yearAgo.toISOString());
          }

          const { data: ordersData } = await query;
          
          rangeSales = ordersData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
          totalOrders = ordersData?.length || 0;
        }
      } catch (err) {
        console.error("❌ Error al cargar desde tabla agregada, usando eventos:", err);
        // Fallback completo a eventos individuales
        const { data: histData, error: histDataError } = await supabase
          .from('dashboard_order_events')
          .select('total_amount')
          .eq('restaurant_id', restaurantId);
        
        console.log('📊 Dashboard - Fallback eventos:', histData);
        console.log('📊 Dashboard - Fallback error:', histDataError);
        
        historicalTotal = histData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
      }
      
      console.log('📊 Dashboard - Resultados finales:', { historicalTotal, rangeSales, totalOrders });

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

  const fetchPopularDishes = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) return;

    setPopularDishesLoading(true);
    try {
      // Calcular fecha de inicio según el rango de tiempo
      const now = new Date();
      let startDate: Date;
      
      if (timeRange === 'weekly') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else if (timeRange === 'yearly') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else {
        startDate = new Date(0); // Historical = todo
      }

      // Obtener IDs de órdenes del restaurante para filtrar items
      let ordersQuery = supabase
        .from('orders')
        .select('id, created_at')
        .eq('restaurant_id', restaurantId);

      let archivedOrdersQuery = supabase
        .from('orders_archive')
        .select('id, created_at')
        .eq('restaurant_id', restaurantId);

      if (timeRange !== 'historical') {
        ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
        archivedOrdersQuery = archivedOrdersQuery.gte('created_at', startDate.toISOString());
      }

      const { data: orders } = await ordersQuery;
      const { data: archivedOrders } = await archivedOrdersQuery;

      const orderIds = [...(orders || []).map(o => o.id), ...(archivedOrders || []).map(o => o.id)];

      if (orderIds.length === 0) {
        setPopularDishes([]);
        setPopularDishesLoading(false);
        return;
      }

      // Obtener batches para filtrar items
      const { data: batches } = await supabase
        .from('order_batches')
        .select('id, order_id')
        .in('order_id', orderIds);

      const { data: archivedBatches } = await supabase
        .from('order_batches_archive')
        .select('id, order_id')
        .in('order_id', orderIds);

      const batchIds = [
        ...(batches || []).map(b => b.id),
        ...(archivedBatches || []).map(b => b.id)
      ];

      if (batchIds.length === 0) {
        setPopularDishes([]);
        setPopularDishesLoading(false);
        return;
      }

      // Obtener items activos
      const { data: activeItems } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity')
        .in('batch_id', batchIds)
        .not('menu_item_id', 'is', null);

      // Obtener items archivados
      const { data: archivedItems } = await supabase
        .from('order_items_archive')
        .select('menu_item_id, quantity')
        .in('batch_id', batchIds)
        .not('menu_item_id', 'is', null);

      // Combinar todos los items
      const allItems = [
        ...(activeItems || []),
        ...(archivedItems || [])
      ];

      if (allItems.length === 0) {
        setPopularDishes([]);
        setPopularDishesLoading(false);
        return;
      }

      // Agrupar por menu_item_id y sumar cantidades
      const itemCounts: Record<string, number> = {};
      allItems.forEach((item: any) => {
        if (item.menu_item_id) {
          itemCounts[item.menu_item_id] = (itemCounts[item.menu_item_id] || 0) + (item.quantity || 1);
        }
      });

      // Obtener los top 5 menu_item_ids por cantidad
      const topItemIds = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => id);

      if (topItemIds.length === 0) {
        setPopularDishes([]);
        setPopularDishesLoading(false);
        return;
      }

      // Obtener nombres de los platos desde menu_items
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, name')
        .in('id', topItemIds)
        .eq('restaurant_id', restaurantId);

      // Crear el array final con nombres y cantidades
      const popularDishesData = topItemIds
        .map(id => {
          const menuItem = menuItems?.find(mi => mi.id === id);
          return {
            menu_item_id: id,
            name: menuItem?.name || 'Plato desconocido',
            total_quantity: itemCounts[id]
          };
        })
        .filter(item => item.name !== 'Plato desconocido');

      setPopularDishes(popularDishesData);
    } catch (err) {
      console.error('Error al cargar platos populares:', err);
      setPopularDishes([]);
    } finally {
      setPopularDishesLoading(false);
    }
  };

  const fetchAverageServiceTime = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) return;

    setServiceTimeLoading(true);
    try {
      // Calcular fecha de inicio según el rango de tiempo
      const now = new Date();
      let startDate: Date;
      
      if (timeRange === 'weekly') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else if (timeRange === 'yearly') {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      } else {
        startDate = new Date(0); // Historical = todo
      }

      // Obtener IDs de órdenes del restaurante
      let ordersQuery = supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId);

      let archivedOrdersQuery = supabase
        .from('orders_archive')
        .select('id')
        .eq('restaurant_id', restaurantId);

      if (timeRange !== 'historical') {
        ordersQuery = ordersQuery.gte('created_at', startDate.toISOString());
        archivedOrdersQuery = archivedOrdersQuery.gte('created_at', startDate.toISOString());
      }

      const { data: orders } = await ordersQuery;
      const { data: archivedOrders } = await archivedOrdersQuery;

      const orderIds = [...(orders || []).map(o => o.id), ...(archivedOrders || []).map(o => o.id)];

      if (orderIds.length === 0) {
        setAverageServiceTime(null);
        setServiceTimeLoading(false);
        return;
      }

      // Consultar batches servidos
      const { data: activeBatches } = await supabase
        .from('order_batches')
        .select('id, created_at, served_at, status, order_id')
        .eq('status', 'SERVIDO')
        .in('order_id', orderIds);

      const { data: archivedBatches } = await supabase
        .from('order_batches_archive')
        .select('id, created_at, served_at, status, order_id')
        .eq('status', 'SERVIDO')
        .in('order_id', orderIds);

      // Combinar todos los batches
      const allBatches = [
        ...(activeBatches || []),
        ...(archivedBatches || [])
      ];

      if (allBatches.length === 0) {
        setAverageServiceTime(null);
        setServiceTimeLoading(false);
        return;
      }

      // Filtrar por rango de tiempo si no es histórico
      let filteredBatches = allBatches;
      if (timeRange !== 'historical') {
        filteredBatches = allBatches.filter((batch: any) => {
          if (!batch.created_at) return false;
          const batchDate = new Date(batch.created_at);
          return batchDate >= startDate;
        });
      }

      if (filteredBatches.length === 0) {
        setAverageServiceTime(null);
        setServiceTimeLoading(false);
        return;
      }

      // Calcular tiempo de servicio (created_at hasta served_at)
      const serviceTimes = filteredBatches
        .filter((batch: any) => batch.created_at && batch.served_at)
        .map((batch: any) => {
          const created = new Date(batch.created_at).getTime();
          const served = new Date(batch.served_at).getTime();
          return served - created;
        })
        .filter((time: number) => time > 0);

      if (serviceTimes.length === 0) {
        setAverageServiceTime(null);
        setServiceTimeLoading(false);
        return;
      }

      // Calcular promedio en minutos
      const averageMs = serviceTimes.reduce((acc, time) => acc + time, 0) / serviceTimes.length;
      const averageMinutes = Math.round(averageMs / (1000 * 60));
      
      setAverageServiceTime(averageMinutes);
    } catch (err) {
      console.error("Error al calcular tiempo promedio de servicio:", err);
      setAverageServiceTime(null);
    } finally {
      setServiceTimeLoading(false);
    }
  };

  const fetchTableOccupancy = async () => {
    const restaurantId = CURRENT_RESTAURANT?.id;
    if (!restaurantId) {
      setOccupancyLoading(false);
      return;
    }
    setOccupancyLoading(true);
    try {
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('id, table_number')
        .eq('restaurant_id', restaurantId);

      if (tablesError) throw tablesError;

      const { data: openOrders, error: ordersError } = await supabase
        .from('orders')
        .select('table_id')
        .eq('restaurant_id', restaurantId)
        .in('status', ['ABIERTO', 'SOLICITADO']);

      if (ordersError) {
        console.warn('Error al obtener órdenes abiertas (ocupación):', ordersError);
      }

      const occupied = new Set(
        (openOrders || []).map((o: { table_id: string }) => o.table_id).filter(Boolean)
      );

      setTables(tablesData || []);
      setOccupiedTableIds(occupied);
    } catch (err) {
      console.error('Error al cargar ocupación de mesas:', err);
      setTables([]);
      setOccupiedTableIds(new Set());
    } finally {
      setOccupancyLoading(false);
    }
  };

  const formatServiceTime = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
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

      {/* Card Facturación - Ancho completo */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <DollarSign size={80} className="text-emerald-600" />
          </div>
          <div className="relative">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Facturación (Pagado)
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

      {/* Ocupación de mesas */}
      <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Ocupación de mesas</h3>
          <Grid3X3 size={20} className="text-slate-600" />
        </div>
        {occupancyLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <p className="text-gray-900 font-bold">Cargando ocupación...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
              <Grid3X3 size={32} />
            </div>
            <p className="text-gray-900 font-bold">No hay mesas configuradas</p>
            <p className="text-xs text-gray-400">Crea mesas en la sección Mesas</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ocupadas</span>
                <span className="text-2xl font-black text-slate-800">{occupiedTableIds.size}</span>
              </div>
              <span className="text-slate-300 font-bold">/</span>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</span>
                <span className="text-2xl font-black text-slate-800">{tables.length}</span>
              </div>
            </div>
            {occupiedTableIds.size > 0 ? (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Mesas ocupadas</p>
                <div className="flex flex-wrap gap-2">
                  {tables
                    .filter((t) => occupiedTableIds.has(t.id))
                    .sort((a, b) => a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' }))
                    .map((t) => (
                      <span
                        key={t.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-sm font-bold text-amber-800"
                      >
                        Mesa {t.table_number}
                      </span>
                    ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">Todas las mesas están libres</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Atención al Cliente</h3>
              <Users size={20} className="text-indigo-600" />
           </div>
           {serviceTimeLoading ? (
             <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
               <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-2xl flex items-center justify-center">
                 <Loader2 size={32} className="animate-spin" />
               </div>
               <div>
                 <p className="text-gray-900 font-bold">Calculando tiempo promedio...</p>
               </div>
             </div>
           ) : averageServiceTime !== null ? (
             <div className="space-y-6">
               <div className="flex items-center justify-center">
                 <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center">
                   <Clock size={40} className="text-indigo-600" />
                 </div>
               </div>
               <div className="text-center">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tiempo Promedio de Servicio</p>
                 <p className="text-5xl font-black text-indigo-600 tracking-tighter mb-2">
                   {formatServiceTime(averageServiceTime)}
                 </p>
                 <p className="text-xs text-gray-500">
                   {timeRange === 'weekly' ? 'Última semana' : 
                    timeRange === 'monthly' ? 'Último mes' : 
                    timeRange === 'yearly' ? 'Último año' : 
                    'Histórico'}
                 </p>
               </div>
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
               <div className="w-16 h-16 bg-indigo-50 text-indigo-400 rounded-2xl flex items-center justify-center">
                 <Clock size={32} />
               </div>
               <div>
                 <p className="text-gray-900 font-bold">No hay datos disponibles</p>
                 <p className="text-xs text-gray-400">Aún no hay batches servidos en este período</p>
               </div>
             </div>
           )}
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Popularidad</h3>
              <TrendingUp size={20} className="text-emerald-600" />
           </div>
           {popularDishesLoading ? (
             <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-400 rounded-2xl flex items-center justify-center">
                 <Loader2 size={32} className="animate-spin" />
               </div>
               <div>
                 <p className="text-gray-900 font-bold">Calculando platos más vendidos...</p>
               </div>
             </div>
           ) : popularDishes.length > 0 ? (
             <div className="space-y-3">
               {popularDishes.map((dish, index) => (
                 <div key={dish.menu_item_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                   <div className="flex items-center gap-3 flex-1">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                       index === 0 ? 'bg-emerald-600 text-white' :
                       index === 1 ? 'bg-emerald-500 text-white' :
                       index === 2 ? 'bg-emerald-400 text-white' :
                       'bg-gray-200 text-gray-600'
                     }`}>
                       {index + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm font-bold text-gray-900 truncate">{dish.name}</p>
                       <p className="text-[10px] text-gray-500 font-medium">{dish.total_quantity} {dish.total_quantity === 1 ? 'venta' : 'ventas'}</p>
                     </div>
                   </div>
                   {index === 0 && (
                     <Trophy size={18} className="text-emerald-600 flex-shrink-0" />
                   )}
                 </div>
               ))}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
               <div className="w-16 h-16 bg-emerald-50 text-emerald-400 rounded-2xl flex items-center justify-center">
                 <Utensils size={32} />
               </div>
               <div>
                 <p className="text-gray-900 font-bold">No hay datos disponibles</p>
                 <p className="text-xs text-gray-400">Aún no hay platos vendidos</p>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
