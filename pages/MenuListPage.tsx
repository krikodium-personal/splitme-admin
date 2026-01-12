import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Star, AlertTriangle, Store, Tag, Search, Utensils, ChevronRight, ArrowUpDown, Loader2, X, Save } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CURRENT_RESTAURANT, MenuItem } from '../types';
import { supabase } from '../supabase';

const MenuListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMode, setSortMode] = useState<'featured' | 'newest' | 'rating'>('featured');
  
  // Filtros desde URL
  const filterFeatured = searchParams.get('featured') === 'true';
  const filterNew = searchParams.get('new') === 'true';
  const filterAvailable = searchParams.get('available') === 'true';
  
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [itemToEditTags, setItemToEditTags] = useState<MenuItem | null>(null);
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    fetchInitialData();
    loadGlobalTags();
  }, []);

  const loadGlobalTags = () => {
    if (!CURRENT_RESTAURANT?.id) return;
    try {
      const savedTags = JSON.parse(localStorage.getItem(`splitme_tags_${CURRENT_RESTAURANT.id}`) || '["Vegetariano", "Sin Gluten", "Vegano", "Picante", "Chef Suggestion"]');
      setGlobalTags(savedTags);
    } catch (e) {
      console.error("Error loading global tags:", e);
    }
  };

  // Leer parámetros de la URL y seleccionar categoría/subcategoría automáticamente
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const subcategoryParam = searchParams.get('subcategory');
    
    if (categoryParam && categories.length > 0) {
      // Verificar que la categoría existe
      const categoryExists = categories.some(c => c.id === categoryParam);
      if (categoryExists) {
        setSelectedParentId(categoryParam);
        
        // Si hay subcategoría, seleccionarla también
        if (subcategoryParam) {
          const subcategoryExists = categories.some(c => c.id === subcategoryParam && c.parent_id === categoryParam);
          if (subcategoryExists) {
            setSelectedSubId(subcategoryParam);
          }
        }
      }
    }
  }, [searchParams, categories]);

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

  const updateURL = (params: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace: true });
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
      // Actualizar URL con el nuevo estado
      updateURL({ featured: !currentStatus ? 'true' : null });
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

  const openEditTagsModal = (item: MenuItem) => {
    setItemToEditTags(item);
    setEditingTags(Array.isArray(item.dietary_tags) ? [...item.dietary_tags] : []);
    setNewTagInput('');
  };

  const addCustomTag = () => {
    if (!CURRENT_RESTAURANT?.id) return;
    const val = newTagInput.trim();
    if (val && !globalTags.includes(val)) {
      const updatedTags = [...globalTags, val];
      setGlobalTags(updatedTags);
      localStorage.setItem(`splitme_tags_${CURRENT_RESTAURANT.id}`, JSON.stringify(updatedTags));
      setNewTagInput('');
      if (!editingTags.includes(val)) {
        setEditingTags([...editingTags, val]);
      }
    }
  };

  const toggleTag = (tag: string) => {
    const newTags = editingTags.includes(tag) 
      ? editingTags.filter(t => t !== tag)
      : [...editingTags, tag];
    setEditingTags(newTags);
  };

  const saveTags = async () => {
    if (!itemToEditTags) return;
    
    setSavingTags(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ dietary_tags: editingTags })
        .eq('id', itemToEditTags.id);

      if (error) throw error;

      // Actualizar el item en el estado local
      setItems(prev => prev.map(item => 
        item.id === itemToEditTags.id 
          ? { ...item, dietary_tags: editingTags }
          : item
      ));

      setItemToEditTags(null);
      setEditingTags([]);
    } catch (err: any) {
      console.error("Error saving tags:", err);
      alert(`Error: ${err.message || 'No se pudieron guardar las etiquetas.'}`);
    } finally {
      setSavingTags(false);
    }
  };

  const processedItems = useMemo(() => {
    let filtered = items.filter(item => {
      const matchesParent = !selectedParentId || item.category_id === selectedParentId;
      const matchesSub = !selectedSubId || item.subcategory_id === selectedSubId;
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFeatured = !filterFeatured || item.is_featured === true;
      const matchesNew = !filterNew || (item.is_new === true);
      const matchesAvailable = !filterAvailable || item.is_available === true;
      return matchesParent && matchesSub && matchesSearch && matchesFeatured && matchesNew && matchesAvailable;
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
  }, [items, selectedParentId, selectedSubId, searchTerm, sortMode, filterFeatured, filterNew, filterAvailable]);

  const parentCats = categories.filter(c => !c.parent_id);
  const subCats = useMemo(() => {
    if (!selectedParentId) return [];
    return categories.filter(c => c.parent_id === selectedParentId);
  }, [categories, selectedParentId]);
  const hasSubcategories = subCats.length > 0;

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

      {itemToEditTags && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Tag size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Editar Etiquetas Dietéticas</h3>
                  <p className="text-sm text-gray-500 font-medium">{itemToEditTags.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setItemToEditTags(null);
                  setEditingTags([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Etiquetas disponibles</label>
                <div className="flex flex-wrap gap-2.5">
                  {globalTags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        editingTags.includes(tag)
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-400 border border-transparent hover:border-indigo-100'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Crear nueva etiqueta</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                    placeholder="Nombre de la etiqueta..."
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <button
                    type="button"
                    onClick={addCustomTag}
                    className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              {editingTags.length > 0 && (
                <div className="pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Etiquetas seleccionadas</label>
                  <div className="flex flex-wrap gap-2">
                    {editingTags.map((tag, index) => (
                      <span
                        key={index}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 animate-in zoom-in-95 duration-200"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className="hover:bg-indigo-100 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-50">
              <button
                onClick={() => {
                  setItemToEditTags(null);
                  setEditingTags([]);
                }}
                className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveTags}
                disabled={savingTags}
                className="flex-1 px-6 py-4 rounded-2xl font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingTags ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar
                  </>
                )}
              </button>
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
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-2xl p-2 border border-gray-100">
            <button
              onClick={() => updateURL({ featured: filterFeatured ? null : 'true' })}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filterFeatured
                  ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                  : 'bg-gray-50 text-gray-400 border border-transparent hover:border-amber-100'
              }`}
            >
              <Star size={14} className="inline mr-1" /> Destacados
            </button>
            <button
              onClick={() => updateURL({ new: filterNew ? null : 'true' })}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filterNew
                  ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                  : 'bg-gray-50 text-gray-400 border border-transparent hover:border-indigo-100'
              }`}
            >
              Nuevos
            </button>
            <button
              onClick={() => updateURL({ available: filterAvailable ? null : 'true' })}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                filterAvailable
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                  : 'bg-gray-50 text-gray-400 border border-transparent hover:border-emerald-100'
              }`}
            >
              Disponibles
            </button>
          </div>
          <Link to="/create" className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3">
            <Plus size={20} /> Nuevo Producto
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Menú principal de categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
          <button 
            onClick={() => { setSelectedParentId(null); setSelectedSubId(null); }}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${!selectedParentId ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-gray-400 border border-gray-100'}`}
          >
            Todos
          </button>
          {parentCats.map(cat => {
            const hasSubs = categories.some(c => c.parent_id === cat.id);
            return (
              <button 
                key={cat.id}
                onClick={() => { setSelectedParentId(cat.id); setSelectedSubId(null); }}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${selectedParentId === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100'}`}
              >
                {cat.name}
                {hasSubs && <ChevronRight size={14} className={selectedParentId === cat.id ? 'text-white' : 'text-gray-400'} />}
              </button>
            );
          })}
        </div>

        {/* Submenú de subcategorías (solo se muestra si hay subcategorías) */}
        {hasSubcategories && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide w-full animate-in fade-in slide-in-from-top-2 duration-300">
            <button 
              onClick={() => setSelectedSubId(null)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${!selectedSubId ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' : 'bg-gray-50 text-gray-500 border border-gray-200'}`}
            >
              Todas las subcategorías
            </button>
            {subCats.map(subCat => (
              <button 
                key={subCat.id}
                onClick={() => setSelectedSubId(subCat.id)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSubId === subCat.id ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
              >
                {subCat.name}
              </button>
            ))}
          </div>
        )}
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
                <p className="text-sm font-black text-indigo-600 mb-3">${Number(item.price).toLocaleString('es-CL')}</p>
                
                {/* Mostrar etiquetas dietéticas */}
                {Array.isArray(item.dietary_tags) && item.dietary_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.dietary_tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.dietary_tags.length > 3 && (
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500">
                        +{item.dietary_tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prep: {item.preparation_time_min}m</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditTagsModal(item);
                      }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar etiquetas dietéticas"
                    >
                      <Tag size={14} />
                    </button>
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