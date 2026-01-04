
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Store, Plus, Search, MapPin, ExternalLink, Loader2, Globe, ShieldCheck, AlertTriangle, Key } from 'lucide-react';
import { Restaurant } from '../types';
import NewRestaurantModal from '../components/NewRestaurantModal';

const SuperAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .order('name');
      
      if (fetchError) throw fetchError;
      if (data) setRestaurants(data);
    } catch (err: any) {
      setError(err.message || "No se pudieron cargar los locales.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNew = () => setShowModal(true);

  const handleCardClick = (id: string) => {
    navigate(`/super-admin/restaurant/${id}`);
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <NewRestaurantModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={fetchRestaurants} 
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <Globe size={24} />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Panel Global</h1>
          </div>
          <p className="text-gray-500 font-medium">Control maestro de la red Splitme</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar restaurante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none w-64 transition-all"
            />
          </div>
          <button 
            onClick={handleOpenNew}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 uppercase tracking-widest text-xs active:scale-95"
          >
            <Plus size={18} /> Nuevo Restaurante
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Locales', value: restaurants.length, icon: Store, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Plataforma', value: 'v1.4.2', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-5">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
               <stat.icon size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <span className="text-2xl font-black text-gray-900">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-600">
          <AlertTriangle size={24} />
          <p className="font-bold">{error}</p>
          <button onClick={fetchRestaurants} className="ml-auto underline font-black text-xs uppercase tracking-widest">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cargando flota...</p>
        </div>
      ) : filteredRestaurants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredRestaurants.map(rest => (
            <div 
              key={rest.id} 
              onClick={() => handleCardClick(rest.id)}
              className="group bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 relative flex flex-col cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 group-hover:border-indigo-200 transition-colors flex items-center justify-center">
                  {rest.logo_url ? (
                    <img src={rest.logo_url} alt={rest.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-indigo-50 text-indigo-600 font-black text-xl">
                      {rest.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                   <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                     rest.plan === 'Enterprise' ? 'bg-purple-100 text-purple-700' : 
                     rest.plan === 'Premium' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                   }`}>
                    {rest.plan}
                   </span>
                   <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Key size={12} />
                   </div>
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors leading-tight">{rest.name}</h3>
                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  <MapPin size={10} className="shrink-0" />
                  <span className="truncate">{rest.address}</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-600/60 text-[10px] font-black uppercase tracking-widest mb-6">
                  <Key size={10} className="shrink-0" />
                  <span>Código: {rest.access_code || '---'}</span>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full bg-gray-50 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2 group/btn shadow-sm">
                  Administrar Local <ExternalLink size={14} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
           <Store size={48} className="mx-auto text-gray-200 mb-4" />
           <p className="text-gray-400 font-bold">No se encontraron locales.</p>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
