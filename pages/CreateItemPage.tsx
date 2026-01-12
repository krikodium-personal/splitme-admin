
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Camera, Save, CheckCircle2, Settings, Tag, Plus, 
  ArrowLeft, Star, Loader2, Image as ImageIcon, Utensils
} from 'lucide-react';
import { NewMenuItem, Category, CURRENT_RESTAURANT } from '../types';
import TagInput from '../components/TagInput';
import NutritionInput from '../components/NutritionInput';
import { supabase, isSupabaseConfigured } from '../supabase';

const CreateItemPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [dataFetching, setDataFetching] = useState(isEditing);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');

  const [formData, setFormData] = useState<NewMenuItem & { average_rating?: number }>({
    restaurant_id: CURRENT_RESTAURANT?.id || '',
    category_id: '',
    subcategory_id: null,
    name: '',
    description: '',
    price: 0,
    dietary_tags: [],
    ingredientsToAdd: [],
    ingredientsToRemove: [],
    nutrition: {
      calories: 0, protein_g: 0, total_fat_g: 0, sat_fat_g: 0, carbs_g: 0, sugars_g: 0, fiber_g: 0, sodium_mg: 0
    },
    image_url: '',
    is_featured: false,
    is_new: false,
    is_available: true,
    preparation_time_min: 15,
    average_rating: 0
  });

  useEffect(() => {
    fetchInitialData();
    if (isEditing) fetchItemToEdit();
  }, [id]);

  const fetchInitialData = async () => {
    if (!isSupabaseConfigured || !CURRENT_RESTAURANT?.id) return;
    try {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('name');
      
      if (cats) setCategories(cats);

      const savedTags = JSON.parse(localStorage.getItem(`splitme_tags_${CURRENT_RESTAURANT.id}`) || '["Vegetariano", "Sin Gluten", "Vegano", "Picante", "Chef Suggestion"]');
      setGlobalTags(savedTags);
    } catch (e) {
      console.error("Error al cargar categorías:", e);
    }
  };

  const fetchItemToEdit = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          restaurant_id: data.restaurant_id,
          category_id: data.category_id || '',
          subcategory_id: data.subcategory_id || null,
          name: data.name,
          description: data.description,
          price: data.price,
          dietary_tags: Array.isArray(data.dietary_tags) ? data.dietary_tags : [],
          ingredientsToAdd: data.customer_customization?.ingredientsToAdd || [],
          ingredientsToRemove: data.customer_customization?.ingredientsToRemove || [],
          nutrition: {
            calories: data.calories || 0,
            protein_g: data.protein_g || 0,
            total_fat_g: data.total_fat_g || 0,
            sat_fat_g: data.sat_fat_g || 0,
            carbs_g: data.carbs_g || 0,
            sugars_g: data.sugars_g || 0,
            fiber_g: data.fiber_g || 0,
            sodium_mg: data.sodium_mg || 0
          },
          image_url: data.image_url,
          is_featured: data.is_featured,
          is_new: data.is_new || false,
          is_available: data.is_available,
          preparation_time_min: data.preparation_time_min,
          average_rating: data.average_rating || 0
        });
        setPriceDisplay(new Intl.NumberFormat('es-CL').format(data.price));
        setPreviewUrl(data.image_url);
      }
    } catch (err) {
      console.error("Error al cargar producto:", err);
      navigate('/menu');
    } finally {
      setDataFetching(false);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = rawValue ? parseInt(rawValue, 10) : 0;
    setPriceDisplay(new Intl.NumberFormat('es-CL').format(numericValue));
    setFormData(prev => ({ ...prev, price: numericValue }));
    if (errors.includes('price')) setErrors(prev => prev.filter(err => err !== 'price'));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => {
      const newState = { ...prev, [name]: val };
      if (name === 'category_id') {
        newState.subcategory_id = null;
      }
      return newState;
    });
    
    if (errors.includes(name)) {
      setErrors(prev => prev.filter(err => err !== name));
    }
  };

  const addCustomTag = () => {
    if (!CURRENT_RESTAURANT?.id) return;
    const val = newTagInput.trim();
    if (val && !globalTags.includes(val)) {
      const updatedTags = [...globalTags, val];
      setGlobalTags(updatedTags);
      localStorage.setItem(`splitme_tags_${CURRENT_RESTAURANT.id}`, JSON.stringify(updatedTags));
      setNewTagInput('');
      const currentTags = Array.isArray(formData.dietary_tags) ? formData.dietary_tags : [];
      if (!currentTags.includes(val)) {
        setFormData(prev => ({ ...prev, dietary_tags: [...currentTags, val] }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !CURRENT_RESTAURANT?.id) return;

    const newErrors: string[] = [];
    if (!formData.name.trim()) newErrors.push('name');
    if (!formData.category_id) newErrors.push('category_id');
    if (formData.price <= 0) newErrors.push('price');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      let finalImageUrl = formData.image_url;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${CURRENT_RESTAURANT.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('menu-items').upload(filePath, selectedFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('menu-items').getPublicUrl(filePath);
          finalImageUrl = urlData.publicUrl;
        }
      }

      const payload = {
        restaurant_id: CURRENT_RESTAURANT.id,
        category_id: formData.category_id || null,
        subcategory_id: formData.subcategory_id || null,
        name: formData.name.trim(),
        price: Number(formData.price),
        description: formData.description.trim(),
        image_url: finalImageUrl,
        calories: Number(formData.nutrition.calories),
        protein_g: Number(formData.nutrition.protein_g),
        total_fat_g: Number(formData.nutrition.total_fat_g),
        sat_fat_g: Number(formData.nutrition.sat_fat_g),
        carbs_g: Number(formData.nutrition.carbs_g),
        sugars_g: Number(formData.nutrition.sugars_g),
        fiber_g: Number(formData.nutrition.fiber_g),
        sodium_mg: Number(formData.nutrition.sodium_mg),
        is_featured: formData.is_featured,
        is_new: formData.is_new,
        is_available: formData.is_available,
        preparation_time_min: Number(formData.preparation_time_min),
        dietary_tags: Array.isArray(formData.dietary_tags) ? formData.dietary_tags : [],
        customer_customization: {
          ingredientsToAdd: formData.ingredientsToAdd,
          ingredientsToRemove: formData.ingredientsToRemove
        }
      };

      const { error } = isEditing 
        ? await supabase.from('menu_items').update(payload).eq('id', id)
        : await supabase.from('menu_items').insert([payload]);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (!isEditing) navigate('/menu');
      }, 1500);
      
    } catch (err: any) {
      console.error("Error saving product:", err.message || err);
      alert(`Error: ${err.message || 'No se pudo guardar el producto.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (dataFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cargando plato...</p>
      </div>
    );
  }

  const parentCategories = categories.filter(c => !c.parent_id);
  const subCategories = categories.filter(c => c.parent_id === formData.category_id);
  const currentDietaryTags = Array.isArray(formData.dietary_tags) ? formData.dietary_tags : [];

  return (
    <div className="max-w-6xl mx-auto pb-20 space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              // Navegar a /menu con los parámetros de categoría y subcategoría del plato
              const params = new URLSearchParams();
              if (formData.category_id) {
                params.set('category', formData.category_id);
              }
              if (formData.subcategory_id) {
                params.set('subcategory', formData.subcategory_id);
              }
              navigate(`/menu${params.toString() ? '?' + params.toString() : ''}`);
            }} 
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 hover:shadow-md transition-all active:scale-90"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {isEditing ? 'Editar Plato' : 'Nuevo Plato'}
              </h1>
              {isEditing && (
                <div className="flex items-center bg-amber-50 px-3 py-1 rounded-xl border border-amber-100 gap-1.5">
                  <Star size={14} fill="#f59e0b" className="text-amber-500" />
                  <span className="text-xs font-black text-amber-700">{(formData.average_rating || 0).toFixed(1)}</span>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-sm font-medium">Define los detalles técnicos y visuales de tu oferta</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit} 
          disabled={loading} 
          className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>}
          {isEditing ? 'Actualizar' : 'Crear Plato'}
        </button>
      </div>

      {success && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 shadow-lg">
          <CheckCircle2 size={28} className="text-emerald-500" />
          <p className="text-emerald-900 font-bold uppercase tracking-widest text-xs">¡Cambios persistidos correctamente!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 text-indigo-600 border-b border-gray-50 pb-4">
              <Utensils size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest">Atributos del Plato</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Comercial *</label>
              <input 
                name="name" value={formData.name} onChange={handleInputChange} 
                className={`w-full text-xl font-bold bg-gray-50 border-2 p-5 rounded-2xl outline-none transition-all ${errors.includes('name') ? 'border-rose-500 bg-rose-50' : 'border-transparent focus:ring-2 focus:ring-indigo-500'}`}
                placeholder="Ej: Lomo Saltado Premium"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Agrupación Principal *</label>
                  <select 
                    name="category_id" 
                    value={formData.category_id || ''} 
                    onChange={handleInputChange} 
                    className={`w-full p-5 bg-gray-50 border-2 rounded-2xl outline-none font-bold appearance-none transition-all ${errors.includes('category_id') ? 'border-rose-500' : 'border-transparent focus:ring-2 focus:ring-indigo-500'}`}
                  >
                    <option value="">Seleccionar...</option>
                    {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Subcategoría</label>
                  <select 
                    name="subcategory_id" 
                    value={formData.subcategory_id || ''} 
                    onChange={handleInputChange} 
                    disabled={!formData.category_id}
                    className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none font-bold disabled:opacity-30 appearance-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Ninguna</option>
                    {subCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Precio *</label>
                  <input 
                    type="text" value={priceDisplay} onChange={handlePriceChange} 
                    className={`w-full p-5 bg-gray-50 border-2 rounded-2xl outline-none font-black text-xl ${errors.includes('price') ? 'border-rose-500' : 'border-transparent text-indigo-600 focus:ring-2 focus:ring-indigo-500'}`}
                    placeholder="$0"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Tiempo Estimado (min)</label>
                  <input 
                    type="number" name="preparation_time_min" value={formData.preparation_time_min} onChange={handleInputChange} 
                    className="w-full p-5 bg-gray-50 border-transparent border-2 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-indigo-500"
                  />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reseña del Plato</label>
              <textarea 
                name="description" value={formData.description} onChange={handleInputChange} 
                rows={4} className="w-full p-5 bg-gray-50 border-transparent border-2 rounded-2xl outline-none resize-none font-medium focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe el sabor, ingredientes y presentación..."
              ></textarea>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 text-amber-600 border-b border-gray-50 pb-4">
              <Settings size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest">Personalización Dinámica</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <TagInput label="Adicionales con costo" placeholder="Ej: Huevo, Palta..." tags={formData.ingredientsToAdd} onChange={tags => setFormData({...formData, ingredientsToAdd: tags})} variant="indigo" />
              <TagInput label="Opciones de retiro" placeholder="Ej: Sin cebolla, Sin ají..." tags={formData.ingredientsToRemove} onChange={tags => setFormData({...formData, ingredientsToRemove: tags})} variant="rose" />
            </div>
          </section>

          <NutritionInput data={formData.nutrition} onChange={n => setFormData({...formData, nutrition: n})} />
        </div>

        <div className="space-y-8">
           <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-6">
              <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Media Visual</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-72 bg-gray-50 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-100 transition-all hover:border-indigo-200 group relative"
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt="Preview"/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ImageIcon className="text-white" size={32} />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-8">
                    <Camera size={40} className="mx-auto mb-4 text-indigo-200 group-hover:scale-110 transition-transform" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dimensiones recomendadas:<br/>800x800px</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setPreviewUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} accept="image/*"/>
              </div>
           </section>

           <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <h3 className="font-black flex items-center gap-2 uppercase tracking-widest text-[10px] text-gray-400">
                <Tag size={16} className="text-indigo-600"/> Etiquetas Dietéticas
              </h3>

              <div className="flex flex-wrap gap-2.5">
                 {globalTags.map(t => (
                   <button 
                    key={t} type="button" 
                    onClick={() => {
                      const tags = Array.isArray(formData.dietary_tags) ? formData.dietary_tags : [];
                      const newTags = tags.includes(t) ? tags.filter(tag => tag !== t) : [...tags, t];
                      setFormData({...formData, dietary_tags: newTags});
                    }} 
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentDietaryTags.includes(t) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400 border border-transparent hover:border-indigo-100'}`}
                   >
                    {t}
                   </button>
                 ))}
              </div>

              <div className="pt-6 border-t border-gray-50 flex gap-2">
                <input 
                  type="text" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  placeholder="Crear tag..." className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-1 focus:ring-indigo-200"
                />
                <button type="button" onClick={addCustomTag} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm">
                  <Plus size={18} />
                </button>
              </div>
           </section>

           <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-6">
              <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">Parámetros de Publicación</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer group p-3 rounded-2xl hover:bg-gray-50 transition-all">
                  <span className="text-sm font-bold text-gray-700">Destacado</span>
                  <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleInputChange} className="w-6 h-6 rounded-lg border-2 border-gray-200 text-indigo-600 transition-all" />
                </label>
                <label className="flex items-center justify-between cursor-pointer group p-3 rounded-2xl hover:bg-gray-50 transition-all">
                  <span className="text-sm font-bold text-gray-700">Nuevo</span>
                  <input type="checkbox" name="is_new" checked={formData.is_new} onChange={handleInputChange} className="w-6 h-6 rounded-lg border-2 border-gray-200 text-indigo-600 transition-all" />
                </label>
                <label className="flex items-center justify-between cursor-pointer group p-3 rounded-2xl hover:bg-gray-50 transition-all">
                  <span className="text-sm font-bold text-gray-700">Stock Disponible</span>
                  <input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleInputChange} className="w-6 h-6 rounded-lg border-2 border-gray-200 text-indigo-600 transition-all" />
                </label>
              </div>
           </section>
        </div>
      </div>
    </div>
  );
};

export default CreateItemPage;
