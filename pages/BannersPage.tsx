
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';
import { Trash2, GripVertical, Upload, Plus, Eye, EyeOff, Loader2, Check, X } from 'lucide-react';

interface Banner {
  id: string;
  restaurant_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

type EditingField = { id: string; field: 'title' | 'description' };

const BannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('banners')
      .select('*')
      .eq('restaurant_id', CURRENT_RESTAURANT.id)
      .order('sort_order', { ascending: true });
    setBanners(data || []);
    setLoading(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !CURRENT_RESTAURANT?.id) return;
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `${CURRENT_RESTAURANT.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('banners').upload(filePath, file);
      if (uploadError) { console.error('Upload error:', uploadError); continue; }
      const { data: urlData } = supabase.storage.from('banners').getPublicUrl(filePath);
      const maxOrder = banners.length > 0 ? Math.max(...banners.map(b => b.sort_order)) : -1;
      const { data: inserted } = await supabase
        .from('banners')
        .insert({ restaurant_id: CURRENT_RESTAURANT.id, image_url: urlData.publicUrl, sort_order: maxOrder + 1, active: true })
        .select()
        .single();
      if (inserted) setBanners(prev => [...prev, inserted as Banner]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleActive = async (banner: Banner) => {
    const { error } = await supabase.from('banners').update({ active: !banner.active }).eq('id', banner.id);
    if (!error) setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, active: !b.active } : b));
  };

  const deleteBanner = async (banner: Banner) => {
    if (!confirm('¿Eliminar este banner?')) return;
    const pathPart = banner.image_url.split('/banners/')[1];
    if (pathPart) await supabase.storage.from('banners').remove([pathPart]);
    await supabase.from('banners').delete().eq('id', banner.id);
    setBanners(prev => prev.filter(b => b.id !== banner.id));
  };

  const startEditing = (banner: Banner, field: 'title' | 'description') => {
    setEditing({ id: banner.id, field });
    setEditValue(banner[field] || '');
  };

  const saveField = async () => {
    if (!editing) return;
    const { error } = await supabase.from('banners').update({ [editing.field]: editValue.trim() || null }).eq('id', editing.id);
    if (!error) {
      setBanners(prev => prev.map(b => b.id === editing.id ? { ...b, [editing.field]: editValue.trim() || null } : b));
    }
    setEditing(null);
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null; dragOverItem.current = null; return;
    }
    const reordered = [...banners];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, dragged);
    const updated = reordered.map((b, i) => ({ ...b, sort_order: i }));
    setBanners(updated);
    dragItem.current = null; dragOverItem.current = null;
    await Promise.all(updated.map(b => supabase.from('banners').update({ sort_order: b.sort_order }).eq('id', b.id)));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners de inicio</h1>
          <p className="text-sm text-gray-500 mt-1">Se muestran en el carrusel hero de la pantalla de inicio</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {uploading ? 'Subiendo...' : 'Agregar banner'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : banners.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center h-48 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-500"
        >
          <Upload size={32} className="mb-3" />
          <p className="font-medium">Clic para subir tu primer banner</p>
          <p className="text-sm mt-1">PNG, JPG, WEBP — ancho recomendado: 800px+</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm transition-opacity ${!banner.active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <GripVertical size={20} className="text-gray-300 shrink-0 cursor-grab" />
                <img
                  src={banner.image_url}
                  alt={`Banner ${index + 1}`}
                  className="w-32 h-16 object-cover rounded-xl shrink-0 bg-gray-100"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Título */}
                  {editing?.id === banner.id && editing.field === 'title' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditing(null); }}
                        className="flex-1 text-sm font-medium border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="Título del banner"
                      />
                      <button onClick={saveField} className="p-1 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                    </div>
                  ) : (
                    <p
                      className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-indigo-600 truncate"
                      onClick={() => startEditing(banner, 'title')}
                    >
                      {banner.title || <span className="text-gray-300 font-normal italic">+ Agregar título</span>}
                    </p>
                  )}
                  {/* Descripción */}
                  {editing?.id === banner.id && editing.field === 'description' ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveField(); if (e.key === 'Escape') setEditing(null); }}
                        className="flex-1 text-xs border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="Texto del banner"
                      />
                      <button onClick={saveField} className="p-1 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
                      <button onClick={() => setEditing(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
                    </div>
                  ) : (
                    <p
                      className="text-xs text-gray-400 cursor-pointer hover:text-indigo-500 truncate"
                      onClick={() => startEditing(banner, 'description')}
                    >
                      {banner.description || <span className="italic">+ Agregar texto</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(banner)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title={banner.active ? 'Ocultar' : 'Mostrar'}>
                    {banner.active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button onClick={() => deleteBanner(banner)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload size={16} />
            Subir más banners
          </button>
        </div>
      )}
    </div>
  );
};

export default BannersPage;
