import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Star, AlertTriangle, Store, Tag, Search, Utensils, ChevronRight, ArrowUpDown, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CURRENT_RESTAURANT, MenuItem } from '../types';
import { supabase } from '../supabase';

const MenuListPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'featured' | 'newest' | 'rating'>('featured');
  
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    if (!CURRENT_RESTAURANT?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, parent_id')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('sort_order');
      
      if (catData) setCategories(catData);

      const { data: itemData } = await supabase
        .from('menu_items')
        .select('*, main_category:categories!category_id(id, name), sub_category:categories!subcategory_id(id, name)')
        .eq('restaurant_id', CURRENT_RESTAURANT.id);
      
      if (itemData) setItems(itemData as any);
    } catch (err) {
      console.error("Error fetching menu data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('menu_items')
      .update({ is_featured: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, is_featured: !currentStatus } : item
      ));
    }
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (!error) {
        setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
        setItemToDelete(null);
      }
    }
  };

  const processedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesParent = !selectedParentId || item.category_id === selectedParentId;
      const matchesSub = !selectedSubId || item.subcategory_id === selectedSubId;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesParent && matchesSub && matchesSearch;
    });

    switch (sortMode) {
      case 'rating':
        return filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      case 'newest':
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'featured':
      default:
        return filtered.sort((a, b) => (a.is_featured === b.is_featured ? 0 : (a.is_featured ? -1 : 1)));
    }
  }, [items, selectedParentId, selectedSubId, searchTerm, sortMode]);

  const parentCats = categories.filter(c => !c.parent_id);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">¿Eliminar Producto?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed italic">
              Vas a eliminar <strong className="text-gray-900 font-bold">"{itemToDelete.name}"</strong>.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setItemToDelete(null)} className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-6 py-4 rounded-2xl font-black bg-rose-600 text-white hover:bg-rose-700 shadow-xl">Borrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Productos</h1>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
            Carta de <span className="font-bold text-indigo-600">{CURRENT_RESTAURANT?.name || 'su restaurante'}</span>
          </p>
        </div>
        
        <Link to="/create" className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3">
          <Plus size={20} /> Nuevo Producto
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
          <button 
            onClick={() => { setSelectedParentId(null); setSelectedSubId(null); }}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${!selectedParentId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Todos
          </button>
          {parentCats.map(cat => (
            <button 
              key={cat.id}
              onClick={() => { setSelectedParentId(cat.id); setSelectedSubId(null); }}
              className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedParentId === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={48} /></div>
      ) : processedItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {processedItems.map(item => (
            <div 
              key={item.id} 
              onClick={() => navigate(`/edit/${item.id}`)}
              className="group bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-2xl transition-all duration-500 relative cursor-pointer"
            >
              <div className="relative h-48 overflow-hidden bg-gray-100">
                {item.image_url && (
                  <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={item.name} />
                )}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                   <button onClick={(e) => toggleFeatured(e, item.id, item.is_featured)} className={`p-2 rounded-xl backdrop-blur-md transition-all ${item.is_featured ? 'bg-amber-400 text-white' : 'bg-white/90 text-gray-400'}`}>
                    <Star size={16} fill={item.is_featured ? 'white' : 'none'} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-gray-900 mb-1">{item.name}</h3>
                <p className="text-sm font-black text-indigo-600 mb-4">${Number(item.price).toLocaleString('es-CL')}</p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prep: {item.preparation_time_min}m</span>
                  <div className="flex items-center gap-2">
                    <Edit2 size={14} className="text-gray-400" />
                    <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }} className="text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-50">
          <Utensils size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-bold">No hay platos en esta categoría.</p>
        </div>
      )}
    </div>
  );
};

export default MenuListPage;