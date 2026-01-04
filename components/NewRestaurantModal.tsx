
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { X, Loader2, Store, CheckCircle2, AlertCircle, MapPin, Info, Camera, UploadCloud, Edit3 } from 'lucide-react';
import { Restaurant } from '../types';

interface NewRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Restaurant | null;
}

const NewRestaurantModal: React.FC<NewRestaurantModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setAddress(initialData.address || '');
        setPreviewUrl(initialData.logo_url || null);
      } else {
        setName('');
        setAddress('');
        setPreviewUrl(null);
      }
      setSelectedFile(null);
      setLocalError(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setLocalError("Imagen demasiado grande (máx 2MB)");
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      setLocalError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setLocalError("Nombre y dirección son obligatorios.");
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      let finalLogoUrl = previewUrl;

      // Solo subir si hay un nuevo archivo seleccionado
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, selectedFile);

        if (uploadError) throw new Error("Fallo al subir imagen al bucket 'logos'");

        const { data: urlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);
        
        finalLogoUrl = urlData.publicUrl;
      }

      const payload = { 
        name: name.trim(),
        address: address.trim(),
        logo_url: finalLogoUrl
      };

      if (initialData?.id) {
        const { error: dbError } = await supabase
          .from('restaurants')
          .update(payload)
          .eq('id', initialData.id);
        if (dbError) throw dbError;
      } else {
        const { error: dbError } = await supabase
          .from('restaurants')
          .insert([payload]);
        if (dbError) throw dbError;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setLocalError(error.message || 'Error al procesar el restaurante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              {initialData ? <Edit3 size={20} /> : <Store size={20} />}
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {initialData ? 'Editar Restaurante' : 'Nuevo Restaurante'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center">
            <div onClick={() => fileInputRef.current?.click()} className="relative group cursor-pointer">
              <div className="w-28 h-28 rounded-full border-4 border-indigo-50 shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center group-hover:border-indigo-200 transition-all">
                {previewUrl ? (
                  <img src={previewUrl} className="w-full h-full object-cover" alt="Logo preview" />
                ) : (
                  <div className="flex flex-col items-center text-gray-300 group-hover:text-indigo-400">
                    <UploadCloud size={32} />
                    <span className="text-[8px] font-black uppercase mt-1 text-center">Subir Logo<br/>Físico</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Camera size={24} className="text-white" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Comercial</label>
              <div className="relative">
                <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="text" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Dirección</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input required type="text" className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Dirección" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          </div>

          {initialData && (
             <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex gap-3">
              <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-gray-500 font-medium italic">ID del sistema: {initialData.id}</p>
            </div>
          )}

          {!initialData && (
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex gap-3">
              <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-indigo-700 font-medium">El <strong>access_code</strong> se generará automáticamente tras guardar.</p>
            </div>
          )}

          {localError && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2"><AlertCircle size={16} />{localError}</div>}

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-[2] py-4 rounded-2xl font-black text-white bg-indigo-600 shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
              <span>{loading ? 'Procesando...' : (initialData ? 'Guardar Cambios' : 'Crear Restaurante')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewRestaurantModal;
