
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, FolderTree, LayoutGrid, Layers, Store, Edit3, Check, 
  AlertTriangle, GripVertical, Loader2
} from 'lucide-react';
import { Category, Restaurant } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface DeleteConfirmState {
  show: boolean;
  id: string | null;
  name: string;
  type: 'category' | 'subcategory';
}

interface MenuStructurePageProps {
  restaurant: Restaurant | null;
}

const MenuStructurePage: React.FC<MenuStructurePageProps> = ({ restaurant }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [newSubCategoryDescription, setNewSubCategoryDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState<'categories' | 'subcategories' | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    id: null,
    name: '',
    type: 'category'
  });

  useEffect(() => {
    if (isSupabaseConfigured && restaurant) {
      fetchCategories();
    } else {
      setLoading(false);
      if (!isSupabaseConfigured) setErrorMsg("Configura Supabase para gestionar el restaurante.");
    }
  }, [restaurant]);

  const fetchCategories = async () => {
    if (!restaurant?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data) {
        setCategories(data);
        const parentCats = data.filter(c => !c.parent_id);
        if (parentCats.length > 0 && !selectedCategoryId) {
          setSelectedCategoryId(parentCats[0].id);
        }
      }
    } catch (err: any) {
      setErrorMsg(`Error de carga: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !restaurant?.id) return;
    setActionLoading(true);
    try {
      const maxOrder = Math.max(0, ...categories.filter(c => !c.parent_id).map(c => c.sort_order || 0));
      const { data, error } = await supabase
        .from('categories')
        .insert([{
          restaurant_id: restaurant.id,
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
          parent_id: null,
          sort_order: maxOrder + 1
        }])
        .select();
      if (error) throw error;
      setNewCategoryName('');
      setNewCategoryDescription('');
      await fetchCategories();
      if (data && data.length > 0) setSelectedCategoryId(data[0].id);
    } catch (err: any) {
      setErrorMsg(`Error al crear: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const addSubCategory = async () => {
    if (!newSubCategoryName.trim() || !selectedCategoryId || !restaurant?.id) return;
    setActionLoading(true);
    try {
      const sibs = categories.filter(c => c.parent_id === selectedCategoryId);
      const maxOrder = Math.max(0, ...sibs.map(c => c.sort_order || 0));
      const { error } = await supabase
        .from('categories')
        .insert([{
          restaurant_id: restaurant.id,
          name: newSubCategoryName.trim(),
          description: newSubCategoryDescription.trim() || null,
          parent_id: selectedCategoryId,
          sort_order: maxOrder + 1
        }]);
      if (error) throw error;
      setNewSubCategoryName('');
      setNewSubCategoryDescription('');
      await fetchCategories();
    } catch (err: any) {
      alert(`Error al añadir subcategoría: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const updateCategory = async (id: string) => {
    if (!editingName.trim() || !restaurant?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingName.trim(), description: editingDescription.trim() || null })
        .eq('id', id)
        .eq('restaurant_id', restaurant.id);
      if (error) throw error;
      setEditingCategoryId(null);
      setEditingName('');
      setEditingDescription('');
      await fetchCategories();
    } catch (err: any) {
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getDraggedItem = () => draggingId ? categories.find(c => c.id === draggingId) : null;
  const isDraggingCategory = () => { const item = getDraggedItem(); return item && !item.parent_id; };
  const isDraggingSubcategory = () => { const item = getDraggedItem(); return item && !!item.parent_id; };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); e.stopPropagation(); if (id !== draggingId) setDragOverId(id); };
  const handleDragLeave = () => { setDragOverId(null); setDropZoneActive(null); };
  const handleDragEnd = () => { setDraggingId(null); setDragOverId(null); setDropZoneActive(null); };

  const handleDropOnCategoriesArea = async (e: React.DragEvent, targetCategoryId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingId || !restaurant?.id) { handleDragEnd(); return; }
    const dragged = getDraggedItem();
    if (!dragged) { handleDragEnd(); return; }

    if (isDraggingSubcategory()) {
      setActionLoading(true);
      try {
        const newParentId = targetCategoryId;
        const siblings = targetCategoryId
          ? categories.filter(c => c.parent_id === targetCategoryId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          : categories.filter(c => !c.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const maxOrder = Math.max(0, ...siblings.map(c => c.sort_order || 0));
        const { error } = await supabase
          .from('categories')
          .update({ parent_id: newParentId, sort_order: maxOrder + 1 })
          .eq('id', dragged.id)
          .eq('restaurant_id', restaurant.id);
        if (error) throw error;
        const menuUpdate: { category_id: string | null; subcategory_id?: string | null } = newParentId
          ? { category_id: newParentId }
          : { category_id: dragged.id, subcategory_id: null };
        const { error: menuErr } = await supabase
          .from('menu_items')
          .update(menuUpdate)
          .eq('subcategory_id', dragged.id)
          .eq('restaurant_id', restaurant.id);
        if (menuErr) throw menuErr;
        await fetchCategories();
        if (!targetCategoryId && selectedCategoryId === dragged.parent_id) setSelectedCategoryId(null);
      } catch (err: any) {
        alert("Error al mover: " + (err?.message || ""));
      } finally {
        setActionLoading(false);
      }
    } else if (targetCategoryId && draggingId !== targetCategoryId) {
      const list = categories.filter(c => !c.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const dragIndex = list.findIndex(c => c.id === draggingId);
      const dropIndex = list.findIndex(c => c.id === targetCategoryId);
      if (dragIndex === -1 || dropIndex === -1) { handleDragEnd(); return; }
      const newList = [...list];
      const [movedItem] = newList.splice(dragIndex, 1);
      newList.splice(dropIndex, 0, movedItem);
      const itemsWithNewOrder = newList.map((item, index) => ({ ...item, sort_order: index + 1 }));
      const otherCategories = categories.filter(c => !!c.parent_id || !newList.find(nl => nl.id === c.id));
      setCategories([...otherCategories, ...itemsWithNewOrder].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setActionLoading(true);
      try {
        const { error } = await supabase.from('categories').upsert(itemsWithNewOrder.map(item => ({ id: item.id, restaurant_id: restaurant.id, name: item.name, description: (item as any).description ?? null, parent_id: null, sort_order: item.sort_order })));
        if (error) throw error;
      } catch (err: any) {
        alert("Error al guardar el orden.");
        fetchCategories();
      } finally {
        setActionLoading(false);
      }
    }
    handleDragEnd();
  };

  const handleDropOnSubcategoriesArea = async (e: React.DragEvent, targetSubId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggingId || !restaurant?.id || !selectedCategoryId) { handleDragEnd(); return; }
    const dragged = getDraggedItem();
    if (!dragged) { handleDragEnd(); return; }

    if (isDraggingCategory()) {
      const hasChildren = categories.some(c => c.parent_id === dragged.id);
      if (hasChildren) {
        alert("No se puede convertir una categoría con subcategorías. Mueve primero las subcategorías a otra categoría o conviértelas en categorías.");
        handleDragEnd();
        return;
      }
      setActionLoading(true);
      try {
        const sibs = categories.filter(c => c.parent_id === selectedCategoryId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        const maxOrder = Math.max(0, ...sibs.map(c => c.sort_order || 0));
        const { error } = await supabase
          .from('categories')
          .update({ parent_id: selectedCategoryId, sort_order: maxOrder + 1 })
          .eq('id', dragged.id)
          .eq('restaurant_id', restaurant.id);
        if (error) throw error;
        const { error: menuErr } = await supabase
          .from('menu_items')
          .update({ category_id: selectedCategoryId, subcategory_id: dragged.id })
          .eq('category_id', dragged.id)
          .eq('restaurant_id', restaurant.id);
        if (menuErr) throw menuErr;
        await fetchCategories();
      } catch (err: any) {
        alert("Error al mover: " + (err?.message || ""));
      } finally {
        setActionLoading(false);
      }
    } else if (targetSubId && draggingId !== targetSubId) {
      const list = categories.filter(c => c.parent_id === selectedCategoryId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const dragIndex = list.findIndex(c => c.id === draggingId);
      const dropIndex = list.findIndex(c => c.id === targetSubId);
      if (dragIndex === -1 || dropIndex === -1) { handleDragEnd(); return; }
      const newList = [...list];
      const [movedItem] = newList.splice(dragIndex, 1);
      newList.splice(dropIndex, 0, movedItem);
      const itemsWithNewOrder = newList.map((item, index) => ({ ...item, sort_order: index + 1 }));
      const otherCategories = categories.filter(c => c.parent_id !== selectedCategoryId);
      setCategories([...otherCategories, ...itemsWithNewOrder].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
      setActionLoading(true);
      try {
        const { error } = await supabase.from('categories').upsert(itemsWithNewOrder.map(item => ({ id: item.id, restaurant_id: restaurant.id, name: item.name, description: (item as any).description ?? null, parent_id: selectedCategoryId, sort_order: item.sort_order })));
        if (error) throw error;
      } catch (err: any) {
        alert("Error al guardar el orden.");
        fetchCategories();
      } finally {
        setActionLoading(false);
      }
    }
    handleDragEnd();
  };

  const executeDelete = async () => {
    if (!deleteConfirm.id || !restaurant?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', deleteConfirm.id).eq('restaurant_id', restaurant.id);
      if (error) throw error;
      if (deleteConfirm.type === 'category' && selectedCategoryId === deleteConfirm.id) setSelectedCategoryId(null);
      setDeleteConfirm({ show: false, id: null, name: '', type: 'category' });
      await fetchCategories();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const parentCategories = categories.filter(c => !c.parent_id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const currentCategory = categories.find(c => c.id === selectedCategoryId);
  const currentSubCategories = categories.filter(c => c.parent_id === selectedCategoryId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (!restaurant && isSupabaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cargando perfil del restaurante...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cargando estructura...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">¿Eliminar {deleteConfirm.type === 'category' ? 'Categoría' : 'Subcategoría'}?</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">Estás a punto de eliminar <strong className="text-gray-900">"{deleteConfirm.name}"</strong>.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ ...deleteConfirm, show: false })} className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={executeDelete} disabled={actionLoading} className="flex-1 px-6 py-4 rounded-2xl font-black bg-rose-600 text-white hover:bg-rose-700 shadow-xl flex items-center justify-center">
                {actionLoading ? <Loader2 size={20} className="animate-spin" /> : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Estructura menú</h1>
        <p className="text-gray-500 mt-1 flex items-center gap-2">
          Categorías y subcategorías de <strong className="text-indigo-600">{restaurant?.name || 'Cargando...'}</strong>
        </p>
      </div>

      {errorMsg && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-600 font-bold">{errorMsg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in slide-in-from-left-4">
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col min-h-[550px]">
            <div className="flex items-center space-x-2 mb-8">
              <LayoutGrid className="text-indigo-600" size={24} />
              <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase tracking-widest text-sm">Categorías Principales</h2>
            </div>
            <div className="space-y-3 mb-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {isDraggingSubcategory() && (
                <div
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropZoneActive('categories'); setDragOverId(null); }}
                  onDragLeave={() => setDropZoneActive(null)}
                  onDrop={(e) => { e.preventDefault(); handleDropOnCategoriesArea(e, null); }}
                  className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center text-sm font-bold ${dropZoneActive === 'categories' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-400'}`}
                >
                  Soltar aquí para convertir a categoría
                </div>
              )}
              {parentCategories.map((cat) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, cat.id)}
                  onDragOver={(e) => handleDragOver(e, cat.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => { e.preventDefault(); handleDropOnCategoriesArea(e, cat.id); }}
                  onDragEnd={handleDragEnd}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 cursor-grab active:cursor-grabbing relative group ${draggingId === cat.id ? 'opacity-50' : ''} ${dragOverId === cat.id ? 'ring-2 ring-indigo-400 ring-offset-2' : ''} ${selectedCategoryId === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-100'}`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="cursor-grab active:cursor-grabbing text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical size={18} /></div>
                    <FolderTree size={18} className={selectedCategoryId === cat.id ? 'text-indigo-200' : 'text-gray-300'} />
                    {editingCategoryId === cat.id ? (
                      <div className="flex flex-col gap-2 flex-1 mr-4" onClick={e => e.stopPropagation()}>
                        <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateCategory(cat.id)} className="w-full bg-white/20 border-none rounded-lg px-2 py-1 text-sm font-bold text-white outline-none" placeholder="Nombre" />
                        <input value={editingDescription} onChange={e => setEditingDescription(e.target.value)} placeholder="Descripción (opcional)" className="w-full bg-white/10 border-none rounded-lg px-2 py-1 text-xs text-white/90 placeholder-white/50 outline-none" />
                        <button onClick={() => updateCategory(cat.id)} className="self-start p-1.5 hover:bg-white/20 rounded-md"><Check size={14}/></button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-bold text-sm tracking-tight">{cat.name}</span>
                        {(cat as any).description && <span className={`text-xs mt-0.5 ${selectedCategoryId === cat.id ? 'text-white/80' : 'text-gray-400'}`}>{(cat as any).description}</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {editingCategoryId !== cat.id && <button onClick={(e) => { e.stopPropagation(); setEditingCategoryId(cat.id); setEditingName(cat.name); setEditingDescription((cat as any).description || ''); }} className={`p-2 rounded-xl transition-all ${selectedCategoryId === cat.id ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 text-gray-400'}`}><Edit3 size={14} /></button>}
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, id: cat.id, name: cat.name, type: 'category' }); }} className={`p-2 rounded-xl transition-all ${selectedCategoryId === cat.id ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 hover:text-rose-600 text-gray-400'}`}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-gray-50 space-y-3">
              <div className="flex space-x-2">
                <input type="text" placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} disabled={actionLoading} className="flex-1 bg-gray-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" />
                <button onClick={addCategory} disabled={actionLoading || !newCategoryName.trim()} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50">{actionLoading ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}</button>
              </div>
              <input type="text" placeholder="Descripción (opcional)" value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} disabled={actionLoading} className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-3 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" />
            </div>
          </div>
        </div>
        <div className="md:col-span-7">
          {currentCategory ? (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 h-full flex flex-col">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Layers size={24} /></div>
                  <div><h2 className="text-2xl font-black text-gray-900 tracking-tight">{currentCategory.name}</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sub-agrupaciones</p></div>
                </div>
              </div>
              <div
                className={`flex flex-col space-y-3 mb-auto overflow-y-auto pr-2 custom-scrollbar rounded-2xl p-2 transition-all ${isDraggingCategory() && dropZoneActive === 'subcategories' ? 'ring-2 ring-indigo-400 ring-offset-2 bg-indigo-50' : ''}`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (isDraggingCategory()) setDropZoneActive('subcategories'); }}
                onDragLeave={() => setDropZoneActive(null)}
                onDrop={(e) => { e.preventDefault(); if (isDraggingCategory()) handleDropOnSubcategoriesArea(e, null); }}
              >
                {currentSubCategories.map((sub) => (
                  <div
                    key={sub.id}
                    draggable={editingCategoryId !== sub.id}
                    onDragStart={(e) => handleDragStart(e, sub.id)}
                    onDragOver={(e) => { e.stopPropagation(); handleDragOver(e, sub.id); }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDropOnSubcategoriesArea(e, sub.id); }}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] group hover:bg-white hover:border-gray-100 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing ${editingCategoryId === sub.id ? 'bg-indigo-50 border-indigo-100' : ''} ${draggingId === sub.id ? 'opacity-50' : ''} ${dragOverId === sub.id ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                  >
                    <div className="flex items-center space-x-4 flex-1 mr-4">
                      {editingCategoryId !== sub.id && <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-indigo-400 transition-colors"><GripVertical size={18} /></div>}
                      {editingCategoryId === sub.id ? (
                      <div className="flex flex-col gap-2 flex-1">
                        <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateCategory(sub.id)} className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-2 text-sm font-bold text-indigo-900 outline-none" placeholder="Nombre" />
                        <input value={editingDescription} onChange={e => setEditingDescription(e.target.value)} placeholder="Descripción (opcional)" className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2 text-xs text-gray-600 outline-none" />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-700 tracking-tight">{sub.name}</span>
                        {(sub as any).description && <span className="text-xs text-gray-500 mt-0.5">{(sub as any).description}</span>}
                      </div>
                    )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingCategoryId === sub.id ? <button onClick={() => updateCategory(sub.id)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md"><Check size={16}/></button> : <button onClick={() => { setEditingCategoryId(sub.id); setEditingName(sub.name); setEditingDescription((sub as any).description || ''); }} className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Edit3 size={18} /></button>}
                      <button onClick={() => setDeleteConfirm({ show: true, id: sub.id, name: sub.name, type: 'subcategory' })} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-gray-50 space-y-3">
                <div className="flex space-x-3">
                  <input type="text" placeholder="Ej: Pasta Larga..." value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} disabled={actionLoading} className="flex-1 bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button onClick={addSubCategory} disabled={actionLoading || !newSubCategoryName.trim()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg flex items-center space-x-3 disabled:opacity-50">{actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}<span className="text-xs uppercase tracking-widest">Añadir</span></button>
                </div>
                <input type="text" placeholder="Descripción (opcional)" value={newSubCategoryDescription} onChange={(e) => setNewSubCategoryDescription(e.target.value)} disabled={actionLoading} className="w-full bg-gray-50 border border-transparent rounded-2xl px-6 py-3 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 h-full flex flex-col items-center justify-center p-12 text-center shadow-sm">
              <Store size={40} className="text-gray-200 mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">Editor de Taxonomía</h3>
              <p className="text-gray-400 text-sm">Selecciona una categoría principal para gestionar subcategorías.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuStructurePage;
