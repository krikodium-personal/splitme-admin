
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  ArrowLeft, Store, MapPin, Receipt, Utensils, DollarSign, 
  Calendar, Loader2, Save, UploadCloud, CheckCircle2, AlertCircle, TrendingUp, Copy, Check
} from 'lucide-react';
import { Restaurant } from '../types';

type TimeRange = 'weekly' | 'monthly' | 'yearly' | 'historical';

const RestaurantDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState({ dishes: 0, orders: 0, sales: 0, historicalSales: 0 });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
  const [copied, setCopied] = useState(false);
  
  // Estados de edición
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchStats();
    }
  }, [id, timeRange]);

  const fetchRestaurant = async () => {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setRestaurant(data);
      setEditName(data.name);
      setEditAddress(data.address || '');
      setPreviewUrl(data.logo_url || null);
    }
    setLoading(false);
  };

  const handleCopyCode = (code?: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value).replace('CLP', '$').trim();
  };

  const fetchStats = async () => {
    if (!id) return;
    setStatsLoading(true);
    try {
      // 1. Conteo de platos
      const { count: dishCount } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', id);

      // 2. Obtener Ventas Históricas para comparativa
      const { data: histData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('restaurant_id', id)
        .eq('status', 'Pagado');
      
      const historicalTotal = histData?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;

      // 3. Ventas por Rango de Tiempo
      let query = supabase.from('orders').select('total_amount').eq('restaurant_id', id).eq('status', 'Pagado');
      
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
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setMessage(null);

    try {
      let finalLogoUrl = previewUrl;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        finalLogoUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('restaurants')
        .update({ name: editName, address: editAddress, logo_url: finalLogoUrl })
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Información actualizada con éxito.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al guardar cambios.' });
    } finally {
      setSaving(false);
    }
  };

  const getPercentageOfHistorical = () => {
    if (stats.historicalSales === 0) return 0;
    return ((stats.sales / stats.historicalSales) * 100).toFixed(1);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader2 className="animate-spin text-indigo-600" size={48} />
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Sincronizando local...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/super-admin')} className="p-4 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 hover:shadow-lg transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-4xl font-black text-gray-900 tracking-tighter">{restaurant?.name}</h1>
               <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                  {restaurant?.plan}
               </span>
            </div>
            <p className="text-gray-500 font-medium flex items-center gap-2 mt-1">
              <MapPin size={14} className="text-indigo-400" /> {restaurant?.address}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6">
           <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Código de Acceso</p>
              <div className="flex items-center gap-3 mt-1">
                 <span className="text-lg font-black text-indigo-600 tracking-widest select-all">{restaurant?.access_code || '---'}</span>
                 <button 
                  onClick={() => handleCopyCode(restaurant?.access_code)}
                  className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="Copiar código"
                 >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                 </button>
              </div>
           </div>
           <div className="w-px h-10 bg-gray-100"></div>
           <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">ID Sistema</p>
              <p className="text-xs font-bold text-gray-900 mt-1 select-all">{restaurant?.id.substring(0, 12)}...</p>
           </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">Rendimiento Comercial</h2>
          <div className="bg-white p-1 rounded-2xl border border-gray-100 flex gap-1 shadow-sm">
            {(['weekly', 'monthly', 'yearly', 'historical'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  timeRange === range ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {range === 'weekly' ? 'Semana' : range === 'monthly' ? 'Mes' : range === 'yearly' ? 'Año' : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card Ventas */}
          <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
               <DollarSign size={80} className="text-emerald-600" />
            </div>
            <div className="relative">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Facturación (Pagado)
              </p>
              {statsLoading ? (
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
            <div>
               <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Volumen de Pedidos</p>
               <div className="flex items-end gap-3">
                  {statsLoading ? (
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
            <div>
               <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Platos en Menú</p>
               <div className="flex items-end gap-3">
                  <span className="text-5xl font-black text-gray-900 tracking-tighter">{stats.dishes}</span>
                  <Utensils className="text-amber-200 mb-2" size={24} />
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor de Información */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden">
        <div className="bg-gray-50 px-12 py-8 border-b border-gray-100 flex items-center gap-3">
          <Store size={20} className="text-indigo-600" />
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Configuración del Local</h2>
        </div>
        
        <form onSubmit={handleUpdate} className="p-12 space-y-10">
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => document.getElementById('logo-upload')?.click()}
                className="w-40 h-40 rounded-[2.5rem] bg-gray-100 border-4 border-white shadow-xl overflow-hidden cursor-pointer group relative"
              >
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <UploadCloud size={32} />
                    <span className="text-[8px] font-black uppercase mt-2">Logo</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <UploadCloud className="text-white" size={24} />
                </div>
              </div>
              <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
              <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Click para cambiar logo</p>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre del Restaurante</label>
                  <input 
                    required 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Dirección Física</label>
                  <input 
                    required 
                    value={editAddress} 
                    onChange={e => setEditAddress(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className={`p-6 rounded-[2rem] flex items-center gap-4 border-2 animate-in slide-in-from-bottom-2 ${
              message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              <p className="font-bold">{message.text}</p>
            </div>
          )}

          <div className="flex justify-end pt-6">
            <button 
              type="submit" 
              disabled={saving}
              className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {saving ? 'Guardando...' : 'Persistir Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestaurantDetailsPage;
