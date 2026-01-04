
import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, UserPlus, Camera, Star, Calendar, Clock, 
  Trash2, CheckCircle2, X, Plus, ChevronRight, Store, Grid, Edit3, Info
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { CURRENT_RESTAURANT, Table } from '../types';

interface Waiter {
  id: string;
  restaurant_id: string;
  full_name: string;
  nickname: string;
  profile_photo_url: string;
  start_date: string;
  average_rating: number;
  is_active: boolean;
  created_at?: string;
}

const WaitersPage: React.FC = () => {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para Edición
  const [editingWaiterId, setEditingWaiterId] = useState<string | null>(null);
  const [selectedTablesInForm, setSelectedTablesInForm] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    start_date: new Date().toISOString().split('T')[0],
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured || !CURRENT_RESTAURANT?.id) {
      if (!CURRENT_RESTAURANT?.id) setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      const { data: waitersData, error: waitersError } = await supabase
        .from('waiters')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('created_at', { ascending: false });
      
      if (waitersError) throw waitersError;
      setWaiters(waitersData || []);

      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id);
      
      if (tablesError) throw tablesError;
      setTables(tablesData || []);

    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (waiter: Waiter) => {
    setEditingWaiterId(waiter.id);
    setFormData({
      full_name: waiter.full_name,
      nickname: waiter.nickname,
      start_date: waiter.start_date,
      is_active: waiter.is_active
    });
    setPreviewUrl(waiter.profile_photo_url);
    
    // Cargar mesas asignadas actualmente a este mesero
    const assigned = tables
      .filter(t => t.waiter_id === waiter.id)
      .map(t => t.id);
    setSelectedTablesInForm(assigned);
    
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingWaiterId(null);
    setFormData({
      full_name: '',
      nickname: '',
      start_date: new Date().toISOString().split('T')[0],
      is_active: true
    });
    setPreviewUrl(null);
    setSelectedFile(null);
    setSelectedTablesInForm([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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

  const toggleTableSelection = (tableId: string) => {
    setSelectedTablesInForm(prev => 
      prev.includes(tableId) 
        ? prev.filter(id => id !== tableId) 
        : [...prev, tableId]
    );
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    if (!CURRENT_RESTAURANT?.id) throw new Error("Restaurante no configurado");
    const fileExt = file.name.split('.').pop();
    const fileName = `waiter-${Date.now()}.${fileExt}`;
    const filePath = `${CURRENT_RESTAURANT.id}/waiters/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('menu-items')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('menu-items').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.nickname || !CURRENT_RESTAURANT?.id) return;

    setSubmitting(true);
    try {
      let photoUrl = previewUrl || 'https://picsum.photos/seed/waiter/200/200';
      if (selectedFile) {
        photoUrl = await uploadProfilePhoto(selectedFile);
      }

      const waiterPayload = {
        restaurant_id: CURRENT_RESTAURANT.id,
        full_name: formData.full_name,
        nickname: formData.nickname,
        profile_photo_url: photoUrl,
        start_date: formData.start_date,
        is_active: formData.is_active
      };

      let waiterId = editingWaiterId;

      if (editingWaiterId) {
        // Actualizar Mesero Existente
        const { error } = await supabase
          .from('waiters')
          .update(waiterPayload)
          .eq('id', editingWaiterId);
        if (error) throw error;
      } else {
        // Crear Nuevo Mesero
        const { data, error } = await supabase
          .from('waiters')
          .insert([{ ...waiterPayload, average_rating: 5.0 }])
          .select()
          .single();
        if (error) throw error;
        waiterId = data.id;
      }

      // SINCRONIZACIÓN DE MESAS
      // 1. Quitar este waiter_id de TODAS las mesas que lo tenían antes
      await supabase
        .from('tables')
        .update({ waiter_id: null })
        .eq('waiter_id', waiterId);

      // 2. Asignar el waiter_id a las mesas seleccionadas en el formulario
      if (selectedTablesInForm.length > 0) {
        await supabase
          .from('tables')
          .update({ waiter_id: waiterId })
          .in('id', selectedTablesInForm);
      }

      closeForm();
      fetchData();
    } catch (err: any) {
      console.error("Error al procesar mesero:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateSeniority = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
    const diffYears = Math.floor(diffMonths / 12);
    const remainingMonths = diffMonths % 12;
    return `${diffYears} ${diffYears === 1 ? 'año' : 'años'}${remainingMonths > 0 ? ` y ${remainingMonths} m` : ''}`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            size={12} 
            className={`${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} 
          />
        ))}
        <span className="text-[10px] font-black text-gray-500 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const toggleStatus = async (e: React.MouseEvent, id: string, currentStatus: boolean) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('waiters')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    
    if (!error) {
      setWaiters(prev => prev.map(w => w.id === id ? { ...w, is_active: !currentStatus } : w));
    }
  };

  const deleteWaiter = async (e: React.MouseEvent, waiter: Waiter) => {
    e.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar a ${waiter.nickname}? Esto desvinculará sus mesas.`)) return;
    
    try {
      // Supabase se encarga del cascade si está configurado, o lo hacemos manual
      const { error } = await supabase.from('waiters').delete().eq('id', waiter.id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const getAssignedTableNumbers = (waiterId: string) => {
    const assigned = tables
      .filter(t => t.waiter_id === waiterId)
      .map(t => t.table_number)
      .sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    
    return assigned.length > 0 ? assigned.join(', ') : 'Ninguna';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Gestión de Staff</h1>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
            <Users size={14} className="text-indigo-600"/> 
            Equipo de servicio de <span className="font-bold text-indigo-600">{CURRENT_RESTAURANT?.name || 'Cargando...'}</span>
          </p>
        </div>
        <button 
          onClick={() => showForm ? closeForm() : setShowForm(true)}
          className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black transition-all active:scale-95 shadow-xl ${
            showForm 
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
          }`}
        >
          {showForm ? <X size={20} /> : <UserPlus size={20} />}
          {showForm ? 'Cancelar' : 'Añadir Mesero'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-indigo-50 animate-in slide-in-from-top-4 duration-500 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                {editingWaiterId ? <Edit3 size={20} /> : <UserPlus size={20} />}
             </div>
             <h2 className="text-2xl font-black text-gray-900 tracking-tight">
               {editingWaiterId ? `Editando a ${formData.nickname}` : 'Registrar Nuevo Mesero'}
             </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Columna Izquierda: Perfil */}
              <div className="lg:col-span-4 flex flex-col items-center">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 rounded-full bg-gray-50 border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-100 transition-all group relative shrink-0 shadow-inner"
                >
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview"/>
                  ) : (
                    <div className="text-center p-4 text-gray-400">
                      <Camera size={40} className="mx-auto mb-2 text-indigo-200" />
                      <p className="text-[10px] font-black uppercase tracking-widest leading-tight">Subir Foto de Perfil</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*"/>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white" size={32} />
                  </div>
                </div>
                <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Toca para cambiar imagen</p>
              </div>

              {/* Columna Derecha: Datos */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre Completo *</label>
                    <input 
                      name="full_name"
                      required
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Ej: Alejandro García"
                      className="w-full bg-gray-50 border-transparent border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Apodo / Nickname *</label>
                    <input 
                      name="nickname"
                      required
                      value={formData.nickname}
                      onChange={handleInputChange}
                      placeholder="Ej: Alex"
                      className="w-full bg-gray-50 border-transparent border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Fecha de Ingreso</label>
                    <div className="relative">
                      <input 
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        className="w-full bg-gray-50 border-transparent border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                      />
                      <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-4 cursor-pointer group p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition-all border-2 border-transparent focus-within:border-indigo-100 shadow-sm h-[60px]">
                      <input 
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="w-6 h-6 rounded-lg border-2 border-gray-200 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-black uppercase tracking-widest text-gray-600">Empleado Activo</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Asignación de Mesas */}
            <div className="space-y-4 pt-6 border-t border-gray-100">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Asignación de Mesas</h3>
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase bg-indigo-50 px-3 py-1 rounded-full">
                    {selectedTablesInForm.length} mesas seleccionadas
                  </span>
               </div>
               
               {tables.length > 0 ? (
                 <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                   {tables.map(table => {
                     const isSelected = selectedTablesInForm.includes(table.id);
                     const isAssignedToOther = table.waiter_id && table.waiter_id !== editingWaiterId;
                     const otherWaiter = isAssignedToOther ? waiters.find(w => w.id === table.waiter_id) : null;

                     return (
                       <button
                         key={table.id}
                         type="button"
                         onClick={() => toggleTableSelection(table.id)}
                         className={`relative p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 group ${
                           isSelected 
                             ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                             : isAssignedToOther
                               ? 'bg-amber-50 border-amber-100 text-amber-600 opacity-60'
                               : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200 hover:bg-indigo-50'
                         }`}
                       >
                         <span className="text-sm font-black">{table.table_number}</span>
                         {isAssignedToOther && !isSelected && (
                           <div className="absolute -top-1 -right-1">
                             <div className="bg-amber-400 text-white rounded-full p-0.5 shadow-sm">
                               <Info size={10} />
                             </div>
                           </div>
                         )}
                         {otherWaiter && !isSelected && (
                           <span className="text-[7px] font-black uppercase tracking-tighter truncate w-full text-center">
                             {otherWaiter.nickname}
                           </span>
                         )}
                       </button>
                     );
                   })}
                 </div>
               ) : (
                 <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No hay mesas creadas en el sistema</p>
                 </div>
               )}
            </div>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={closeForm}
                className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-xs"
              >
                Descartar
              </button>
              <button 
                type="submit" 
                disabled={submitting}
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
              >
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={20}/>}
                {editingWaiterId ? 'Actualizar Información' : 'Registrar Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] h-64 animate-pulse border border-gray-100"></div>
          ))}
        </div>
      ) : waiters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {waiters.map(waiter => (
            <div 
              key={waiter.id}
              onClick={() => startEditing(waiter)}
              className={`group bg-white rounded-[2.5rem] border shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden cursor-pointer relative ${
                editingWaiterId === waiter.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-gray-100'
              }`}
            >
              <div className="p-8 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className={`w-24 h-24 rounded-full p-1 border-2 transition-colors ${waiter.is_active ? 'border-emerald-500' : 'border-gray-200'}`}>
                    <img 
                      src={waiter.profile_photo_url} 
                      className="w-full h-full rounded-full object-cover grayscale-0 group-hover:scale-105 transition-transform duration-500" 
                      alt={waiter.nickname}
                    />
                  </div>
                  {waiter.is_active && (
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                  )}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg">
                        <Edit3 size={14} />
                     </div>
                  </div>
                </div>

                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                  {waiter.nickname}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                  {waiter.full_name}
                </p>

                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="bg-gray-50/80 px-4 py-2 rounded-xl flex items-center gap-3 w-full justify-center">
                    {renderStars(waiter.average_rating)}
                    <div className="h-3 w-px bg-gray-200"></div>
                    <div className="flex items-center gap-1.5 text-indigo-600">
                      <Clock size={12} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">
                        {calculateSeniority(waiter.start_date)}
                      </span>
                    </div>
                  </div>

                  {/* Mesas Asignadas */}
                  <div className="w-full px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Grid size={10} className="text-indigo-600" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Mesas</span>
                    </div>
                    <p className="text-[11px] font-bold text-indigo-600 truncate">
                      {getAssignedTableNumbers(waiter.id)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full mt-2">
                    <button 
                      onClick={(e) => toggleStatus(e, waiter.id, waiter.is_active)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        waiter.is_active 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-rose-50 hover:text-rose-600' 
                          : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                      }`}
                    >
                      {waiter.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button 
                      onClick={(e) => deleteWaiter(e, waiter)}
                      className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-center bg-white rounded-[3rem] border border-gray-50 shadow-sm">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-200 rounded-full flex items-center justify-center mb-6">
            <Users size={48} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Sin personal registrado</h3>
          <p className="text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
            Comienza añadiendo a los miembros de tu equipo para gestionar sus valoraciones y actividad.
          </p>
          <button 
            onClick={() => setShowForm(true)}
            className="mt-8 text-indigo-600 font-black text-sm uppercase tracking-widest hover:underline flex items-center gap-2"
          >
            <Plus size={16} /> Añadir primer mesero
          </button>
        </div>
      )}
    </div>
  );
};

export default WaitersPage;
