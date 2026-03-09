import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Star, AlertTriangle, Store, Tag, Search, Utensils, ChevronRight, ArrowUpDown, Loader2, X, Save, LayoutGrid, List, CheckSquare, Square, Heading } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CURRENT_RESTAURANT, MenuItem, MenuSectionHeader } from '../types';
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

  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState<string>('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const [sectionHeaders, setSectionHeaders] = useState<MenuSectionHeader[]>([]);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');

  useEffect(() => {
    fetchInitialData();
    loadGlobalTags();
  }, []);

  useEffect(() => {
    fetchSectionHeaders();
  }, [selectedParentId, selectedSubId, CURRENT_RESTAURANT?.id]);

  const fetchSectionHeaders = async () => {
    if (!CURRENT_RESTAURANT?.id || !selectedParentId) {
      setSectionHeaders([]);
      return;
    }
    try {
      const q = supabase
        .from('menu_section_headers')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .eq('category_id', selectedParentId);
      if (selectedSubId) {
        q.eq('subcategory_id', selectedSubId);
      } else {
        q.is('subcategory_id', null);
      }
      const { data } = await q.order('sort_order');

      setSectionHeaders((data as MenuSectionHeader[]) || []);
    } catch {
      setSectionHeaders([]);
    }
  };

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

  const getAvailability = (item: MenuItem) => item.availability ?? item.is_available ?? true;

  const toggleAvailability = async (e: React.MouseEvent, id: string, currentAvailability: boolean) => {
    e.stopPropagation();
    const newVal = !currentAvailability;
    const { error } = await supabase
      .from('menu_items')
      .update({ availability: newVal, is_available: newVal })
      .eq('id', id);
    
    if (!error) {
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, availability: newVal, is_available: newVal } : item
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedItems.map(i => i.id)));
    }
  };

  const handleBulkAssignCategory = async () => {
    if (!bulkCategoryId || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      const payload: Record<string, unknown> = { category_id: bulkCategoryId };
      if (bulkSubcategoryId) {
        payload.subcategory_id = bulkSubcategoryId;
      } else {
        payload.subcategory_id = null;
      }
      const { error } = await supabase
        .from('menu_items')
        .update(payload)
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      const mainCat = categories.find(c => c.id === bulkCategoryId);
      const subCat = bulkSubcategoryId ? categories.find(c => c.id === bulkSubcategoryId) : null;

      setItems(prev => prev.map(item => 
        selectedIds.has(item.id) 
          ? { 
              ...item, 
              category_id: bulkCategoryId, 
              subcategory_id: bulkSubcategoryId || null,
              main_category: mainCat ? { id: mainCat.id, name: mainCat.name } : null,
              sub_category: subCat ? { id: subCat.id, name: subCat.name } : null
            } 
          : item
      ));
      setSelectedIds(new Set());
      setSelectionMode(false);
      setBulkCategoryId('');
      setBulkSubcategoryId('');
    } catch (err: any) {
      alert(`Error: ${err.message || 'No se pudo guardar.'}`);
    } finally {
      setBulkSaving(false);
    }
  };

  const bulkSubCats = useMemo(() => {
    if (!bulkCategoryId) return [];
    return categories.filter(c => c.parent_id === bulkCategoryId);
  }, [categories, bulkCategoryId]);

  const addSectionHeader = async () => {
    if (!newSectionTitle.trim() || !selectedParentId || !CURRENT_RESTAURANT?.id) return;
    setAddingSection(true);
    try {
      const maxOrder = Math.max(0, ...sectionHeaders.map(s => s.sort_order || 0));
      const { data, error } = await supabase
        .from('menu_section_headers')
        .insert({
          restaurant_id: CURRENT_RESTAURANT.id,
          category_id: selectedParentId,
          subcategory_id: selectedSubId || null,
          title: newSectionTitle.trim(),
          sort_order: maxOrder + 1
        })
        .select()
        .single();
      if (error) throw error;
      setSectionHeaders(prev => [...prev, data as MenuSectionHeader]);
      setNewSectionTitle('');
    } catch (err: any) {
      alert(`Error: ${err.message || 'No se pudo crear el subtítulo.'}`);
    } finally {
      setAddingSection(false);
    }
  };

  const updateSectionHeader = async (id: string) => {
    if (!editingSectionTitle.trim()) return;
    try {
      const { error } = await supabase
        .from('menu_section_headers')
        .update({ title: editingSectionTitle.trim() })
        .eq('id', id);
      if (error) throw error;
      setSectionHeaders(prev => prev.map(s => s.id === id ? { ...s, title: editingSectionTitle.trim() } : s));
      setEditingSectionId(null);
      setEditingSectionTitle('');
    } catch (err: any) {
      alert(`Error: ${err.message || 'No se pudo actualizar.'}`);
    }
  };

  const deleteSectionHeader = async (id: string) => {
    if (!confirm('¿Eliminar este subtítulo? Los productos quedarán sin sección.')) return;
    try {
      const { error } = await supabase.from('menu_section_headers').delete().eq('id', id);
      if (error) throw error;
      setSectionHeaders(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      alert(`Error: ${err.message || 'No se pudo eliminar.'}`);
    }
  };

  const assignSectionToItem = async (itemId: string, sectionId: string | null) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ section_id: sectionId })
        .eq('id', itemId);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, section_id: sectionId } : i));
    } catch (err: any) {
      alert(`Error: ${err.message || 'No se pudo asignar.'}`);
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

    if (!selectedParentId && !selectedSubId) {
      return filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
    }
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

  const groupedForDisplay = useMemo(() => {
    const groups: { sectionId: string | null; sectionTitle: string | null; items: MenuItem[] }[] = [];
    const withoutSection = processedItems.filter(i => !(i as any).section_id);
    if (withoutSection.length > 0) {
      groups.push({ sectionId: null, sectionTitle: null, items: withoutSection });
    }
    for (const sec of [...sectionHeaders].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))) {
      const items = processedItems.filter(i => (i as any).section_id === sec.id);
      groups.push({ sectionId: sec.id, sectionTitle: sec.title, items });
    }
    if (groups.length === 0 && processedItems.length > 0) {
      groups.push({ sectionId: null, sectionTitle: null, items: processedItems });
    }
    return groups;
  }, [processedItems, sectionHeaders]);

  const parentCats = categories.filter(c => !c.parent_id);
  const subCats = useMemo(() => {
    if (!selectedParentId) return [];
    return categories.filter(c => c.parent_id === selectedParentId);
  }, [categories, selectedParentId]);
  const hasSubcategories = subCats.length > 0;
  const canAddSections = Boolean(selectedParentId);

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

      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-40 bg-indigo-600 text-white rounded-2xl p-4 shadow-xl flex flex-wrap items-center gap-4 animate-in slide-in-from-bottom-2">
          <span className="font-black text-sm">{selectedIds.size} producto{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <select
              value={bulkCategoryId}
              onChange={(e) => { setBulkCategoryId(e.target.value); setBulkSubcategoryId(''); }}
              className="bg-white/20 border border-white/30 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/50 [&>option]:text-gray-900"
            >
              <option value="">Categoría...</option>
              {parentCats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={bulkSubcategoryId}
              onChange={(e) => setBulkSubcategoryId(e.target.value)}
              disabled={!bulkCategoryId}
              className="bg-white/20 border border-white/30 rounded-xl px-4 py-2.5 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 [&>option]:text-gray-900"
            >
              <option value="">Subcategoría (opcional)</option>
              {bulkSubCats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleBulkAssignCategory}
            disabled={!bulkCategoryId || bulkSaving}
            className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2"
          >
            {bulkSaving ? <Loader2 size={16} className="animate-spin" /> : null}
            Aplicar
          </button>
          <button
            onClick={() => { setSelectedIds(new Set()); setSelectionMode(false); }}
            className="px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-xl font-bold text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Productos</h1>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-2xl p-2 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">Filtrar por:</span>
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
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-gray-100">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              title="Vista tarjetas"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
              title="Vista lista"
            >
              <List size={18} />
            </button>
          </div>
          <button
            onClick={() => { setSelectionMode(!selectionMode); setSelectedIds(new Set()); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${selectionMode ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
          >
            {selectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
            Seleccionar
          </button>
          <Link to="/create" className="ml-auto bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3">
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
      ) : processedItems.length > 0 || (canAddSections && sectionHeaders.length > 0) ? (
        <>
          {canAddSections && (
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Heading size={18} className="text-indigo-600" />
              <span className="text-sm font-bold text-gray-700">Subtítulos:</span>
              <div className="flex flex-wrap items-center gap-2">
                {sectionHeaders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(sec => (
                  <div key={sec.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gray-200">
                    {editingSectionId === sec.id ? (
                      <>
                        <input
                          value={editingSectionTitle}
                          onChange={e => setEditingSectionTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && updateSectionHeader(sec.id)}
                          className="w-32 px-2 py-1 text-sm font-bold border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          autoFocus
                        />
                        <button onClick={() => updateSectionHeader(sec.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={14} /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-gray-800">{sec.title}</span>
                        <button onClick={() => { setEditingSectionId(sec.id); setEditingSectionTitle(sec.title); }} className="p-1 text-gray-400 hover:text-indigo-600 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => deleteSectionHeader(sec.id)} className="p-1 text-gray-400 hover:text-rose-500 rounded"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSectionHeader())}
                    placeholder="Nuevo subtítulo..."
                    className="w-40 px-3 py-1.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button onClick={addSectionHeader} disabled={addingSection || !newSectionTitle.trim()} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-50">
                    {addingSection ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )}
          {selectionMode && (
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={toggleSelectAll}
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                {selectedIds.size === processedItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
          )}
          {viewMode === 'cards' ? (
            <div className="space-y-10">
              {groupedForDisplay.map((group, gi) => (
                <div key={gi}>
                  {group.sectionTitle && (
                    <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                      <Heading size={20} className="text-indigo-500" />
                      {group.sectionTitle}
                    </h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {group.items.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => !selectionMode && navigate(`/edit/${item.id}`)}
                  className={`group bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col transition-all duration-500 relative ${selectionMode ? 'cursor-default border-2' : 'cursor-pointer border-gray-100 hover:shadow-2xl'} ${selectedIds.has(item.id) ? 'border-indigo-500 ring-2 ring-indigo-200' : ''}`}
                >
                  {selectionMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      className="absolute top-4 left-4 z-10 p-2 rounded-xl bg-white/90 backdrop-blur-md hover:bg-indigo-100 transition-colors"
                    >
                      {selectedIds.has(item.id) ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} className="text-gray-400" />}
                    </button>
                  )}
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
                    {Array.isArray(item.dietary_tags) && item.dietary_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.dietary_tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600">{tag}</span>
                        ))}
                        {item.dietary_tags.length > 3 && <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500">+{item.dietary_tags.length - 3}</span>}
                      </div>
                    )}
                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAvailability(e, item.id, getAvailability(item)); }}
                            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${getAvailability(item) ? 'bg-emerald-500 border-emerald-500' : 'bg-rose-500 border-rose-500'}`}
                            title={getAvailability(item) ? 'Disponible (clic para desactivar)' : 'No disponible (clic para activar)'}
                          >
                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform ${getAvailability(item) ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                          <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                            {item.stock_quantity != null ? `Stock: ${item.stock_quantity}` : 'Sin stock'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Prep: {item.preparation_time_min}m</span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openEditTagsModal(item); }} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar etiquetas dietéticas"><Tag size={14} /></button>
                        {!selectionMode && <Edit2 size={14} className="text-gray-400" />}
                        <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }} className="text-gray-400 hover:text-rose-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {selectionMode && (
                        <th className="text-left p-4 w-12">
                          <button onClick={toggleSelectAll} className="p-1">
                            {selectedIds.size === processedItems.length ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-gray-400" />}
                          </button>
                        </th>
                      )}
                      <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Producto</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Precio</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Disponible</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Stock</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</th>
                      <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Subcategoría</th>
                      {canAddSections && (
                        <th className="text-left p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Subtítulo</th>
                      )}
                      <th className="text-right p-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedForDisplay.map((group, gi) => (
                      <React.Fragment key={gi}>
                        {group.sectionTitle && (
                          <tr className="bg-indigo-50/50 border-b border-indigo-100">
                            <td colSpan={7 + (selectionMode ? 1 : 0) + (canAddSections ? 1 : 0)} className="p-3 pl-4">
                              <span className="text-sm font-black text-indigo-700 flex items-center gap-2">
                                <Heading size={16} /> {group.sectionTitle}
                              </span>
                            </td>
                          </tr>
                        )}
                        {group.items.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => !selectionMode && navigate(`/edit/${item.id}`)}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${selectionMode ? 'cursor-default' : 'cursor-pointer'} ${selectedIds.has(item.id) ? 'bg-indigo-50/50' : ''}`}
                      >
                        {selectionMode && (
                          <td className="p-4">
                            <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className="p-1">
                              {selectedIds.has(item.id) ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} className="text-gray-400" />}
                            </button>
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {item.image_url && (
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900">{item.name}</p>
                              {Array.isArray(item.dietary_tags) && item.dietary_tags.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {item.dietary_tags.slice(0, 2).map((t, i) => (
                                    <span key={i} className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-black text-indigo-600">${Number(item.price).toLocaleString('es-CL')}</td>
                        <td className="p-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleAvailability(e, item.id, getAvailability(item)); }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${getAvailability(item) ? 'bg-emerald-500 border-emerald-500' : 'bg-rose-500 border-rose-500'}`}
                            title={getAvailability(item) ? 'Disponible (clic para desactivar)' : 'No disponible (clic para activar)'}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${getAvailability(item) ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-700">
                          {item.stock_quantity != null ? item.stock_quantity : '—'}
                        </td>
                        <td className="p-4 text-sm text-gray-600">{(item as any).main_category?.name || '—'}</td>
                        <td className="p-4 text-sm text-gray-600">{(item as any).sub_category?.name || '—'}</td>
                        {canAddSections && (
                          <td className="p-4" onClick={e => e.stopPropagation()}>
                            <select
                              value={item.section_id ?? ''}
                              onChange={e => assignSectionToItem(item.id, e.target.value || null)}
                              className="text-sm font-medium border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 bg-white min-w-[120px]"
                            >
                              <option value="">Sin subtítulo</option>
                              {sectionHeaders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(sec => (
                                <option key={sec.id} value={sec.id}>{sec.title}</option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); toggleFeatured(e, item.id, item.is_featured); }} className={`p-2 rounded-lg ${item.is_featured ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}><Star size={16} fill={item.is_featured ? 'currentColor' : 'none'} /></button>
                            <button onClick={(e) => { e.stopPropagation(); openEditTagsModal(item); }} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg"><Tag size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }} className="p-2 text-gray-400 hover:text-rose-500 rounded-lg"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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