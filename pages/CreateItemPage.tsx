
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Camera, Save, CheckCircle2, Settings, Tag, Plus, 
  ArrowLeft, Star, Loader2, Image as ImageIcon, Utensils,
  Layers, Trash2, GripVertical, BookmarkPlus, Copy
} from 'lucide-react';
import { NewMenuItem, Category, CURRENT_RESTAURANT, VariantPriceType, VariantSelectionType, MenuSectionHeader } from '../types';
import TagInput from '../components/TagInput';
import NutritionInput from '../components/NutritionInput';
import { supabase, isSupabaseConfigured } from '../supabase';

interface VariantOptionForm {
  id?: string;
  name: string;
  description?: string;
  price_type: VariantPriceType;
  price_amount: number;
  sort_order: number;
}

interface VariantGroupForm {
  id?: string;
  name: string;
  selection: VariantSelectionType;
  max_selection?: number | null;
  required: boolean;
  sort_order: number;
  options: VariantOptionForm[];
}

interface VariantTemplate {
  id: string;
  name: string;
  groups: { id: string; name: string; selection: VariantSelectionType; max_selection?: number | null; required: boolean; sort_order: number; options: { id: string; name: string; description?: string; price_type: VariantPriceType; price_amount: number; sort_order: number }[] }[];
}

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
  const [variantGroups, setVariantGroups] = useState<VariantGroupForm[]>([]);
  const [variantTemplates, setVariantTemplates] = useState<VariantTemplate[]>([]);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const [sectionHeaders, setSectionHeaders] = useState<MenuSectionHeader[]>([]);

  const [formData, setFormData] = useState<NewMenuItem & { average_rating?: number }>({
    restaurant_id: CURRENT_RESTAURANT?.id || '',
    category_id: '',
    subcategory_id: null,
    section_id: null,
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
    availability: true,
    stock_quantity: null as number | null,
    preparation_time_min: 15,
    average_rating: 0
  });

  useEffect(() => {
    fetchInitialData();
    if (isEditing) fetchItemToEdit();
  }, [id]);

  useEffect(() => {
    if (!formData.category_id || !isSupabaseConfigured || !CURRENT_RESTAURANT?.id) {
      setSectionHeaders([]);
      return;
    }
    const fetchSections = async () => {
      let q = supabase
        .from('menu_section_headers')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .eq('category_id', formData.category_id);
      if (formData.subcategory_id) {
        q = q.eq('subcategory_id', formData.subcategory_id);
      } else {
        q = q.is('subcategory_id', null);
      }
      const { data } = await q.order('sort_order');
      setSectionHeaders((data as MenuSectionHeader[]) || []);
    };
    fetchSections();
  }, [formData.category_id, formData.subcategory_id]);

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

      const { data: templates } = await supabase
        .from('variant_templates')
        .select('id, name')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('name');
      if (templates?.length) {
        const { data: groups } = await supabase
          .from('variant_group_templates')
          .select('*')
          .in('variant_template_id', templates.map(t => t.id))
          .order('sort_order');
        const groupIds = (groups || []).map(g => g.id);
        const { data: opts } = groupIds.length ? await supabase
          .from('variant_option_templates')
          .select('*')
          .in('variant_group_template_id', groupIds)
          .order('sort_order') : { data: [] };
        setVariantTemplates(templates.map(t => ({
          id: t.id,
          name: t.name,
          groups: (groups || [])
            .filter(g => g.variant_template_id === t.id)
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map(g => ({
              id: g.id,
              name: g.name,
              selection: (g.selection === 'multiple' ? 'multiple' : 'individual') as VariantSelectionType,
              max_selection: g.max_selection != null ? Number(g.max_selection) : null,
              required: g.required ?? true,
              sort_order: g.sort_order ?? 0,
              options: (opts || [])
                .filter(o => o.variant_group_template_id === g.id)
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                .map(o => ({
                  id: o.id,
                  name: o.name,
                  description: o.description ?? '',
                  price_type: o.price_type as VariantPriceType,
                  price_amount: Number(o.price_amount) || 0,
                  sort_order: o.sort_order ?? 0
                }))
            }))
        })));
      }
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
          section_id: data.section_id ?? null,
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
          availability: data.availability ?? data.is_available ?? true,
          stock_quantity: data.stock_quantity != null ? Number(data.stock_quantity) : null,
          preparation_time_min: data.preparation_time_min,
          average_rating: data.average_rating || 0
        });
        setPriceDisplay(new Intl.NumberFormat('es-CL').format(data.price));
        setPreviewUrl(data.image_url);

        // Cargar variantes
        const { data: groups } = await supabase
          .from('variant_groups')
          .select('*')
          .eq('menu_item_id', id)
          .order('sort_order');
        if (groups?.length) {
          const { data: allOptions } = await supabase
            .from('variant_options')
            .select('*')
            .in('variant_group_id', groups.map(g => g.id))
            .order('sort_order');
          setVariantGroups(groups.map(g => ({
            id: g.id,
            name: g.name,
            selection: (g.selection === 'multiple' ? 'multiple' : 'individual') as VariantSelectionType,
            max_selection: g.max_selection != null ? Number(g.max_selection) : null,
            required: g.required ?? true,
            sort_order: g.sort_order ?? 0,
            options: (allOptions || [])
              .filter(o => o.variant_group_id === g.id)
              .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map(o => ({
                id: o.id,
                name: o.name,
                description: o.description ?? '',
                price_type: o.price_type as VariantPriceType,
                price_amount: Number(o.price_amount) || 0,
                sort_order: o.sort_order ?? 0
              }))
          })));
        }
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
        newState.section_id = null;
      }
      if (name === 'subcategory_id') {
        newState.section_id = null;
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

  const handleSaveAsTemplate = async () => {
    const name = templateNameInput.trim();
    if (!name || !CURRENT_RESTAURANT?.id) return;
    const valid = variantGroups.filter(g => g.name.trim() && g.options.some(o => (o.name ?? '').trim()));
    if (!valid.length) {
      alert('Agrega al menos un grupo con nombre y al menos una opción para guardar como plantilla.');
      return;
    }
    setSavingTemplate(true);
    try {
      const { data: tpl, error: tplErr } = await supabase.from('variant_templates').insert({
        restaurant_id: CURRENT_RESTAURANT.id,
        name
      }).select('id').single();
      if (tplErr) throw tplErr;
      if (!tpl?.id) throw new Error('No se pudo crear la plantilla');
      for (let i = 0; i < valid.length; i++) {
        const g = valid[i];
        const { data: grp, error: grpErr } = await supabase.from('variant_group_templates').insert({
          variant_template_id: tpl.id,
          name: g.name.trim(),
          selection: g.selection || 'individual',
          max_selection: g.selection === 'multiple' && g.max_selection != null && g.max_selection > 0 ? g.max_selection : null,
          required: g.required,
          sort_order: i
        }).select('id').single();
        if (grpErr) throw grpErr;
        if (!grp?.id) continue;
        for (let j = 0; j < g.options.length; j++) {
          const o = g.options[j];
          const optName = (o.name ?? '').trim() || 'Opción';
          await supabase.from('variant_option_templates').insert({
            variant_group_template_id: grp.id,
            name: optName,
            description: (o.description ?? '').trim() || null,
            price_type: o.price_type,
            price_amount: Number(o.price_amount) ?? 0,
            sort_order: j
          });
        }
      }
      setTemplateNameInput('');
      await fetchInitialData();
      alert('Plantilla guardada. Ya puedes aplicarla a otros platos.');
    } catch (err: any) {
      alert(`Error: ${err.message || 'No se pudo guardar la plantilla.'}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  const hasReplacePriceVariants = variantGroups.some(g => g.required && g.options.some(o => o.price_type === 'replace'));

  const handleApplyTemplate = async (templateId: string) => {
    const tpl = variantTemplates.find(t => t.id === templateId);
    if (!tpl?.groups?.length) return;
    setApplyingTemplate(true);
    try {
      const groups: VariantGroupForm[] = tpl.groups.map((g, gi) => ({
        name: g.name,
        selection: g.selection || 'individual',
        max_selection: g.max_selection ?? null,
        required: g.required,
        sort_order: gi,
        options: g.options.map((o, oi) => ({
          name: o.name,
          description: o.description ?? '',
          price_type: o.price_type,
          price_amount: o.price_amount,
          sort_order: oi
        }))
      }));
      setVariantGroups(groups);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !CURRENT_RESTAURANT?.id) return;

    const newErrors: string[] = [];
    if (!formData.name.trim()) newErrors.push('name');
    if (!formData.category_id) newErrors.push('category_id');
    if (!hasReplacePriceVariants && formData.price <= 0) newErrors.push('price');

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
        section_id: (formData.section_id && String(formData.section_id).trim()) ? formData.section_id : null,
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
        availability: (formData as any).availability ?? formData.is_available,
        stock_quantity: (formData as any).stock_quantity != null && (formData as any).stock_quantity !== '' ? Number((formData as any).stock_quantity) : null,
        preparation_time_min: Number(formData.preparation_time_min),
        dietary_tags: Array.isArray(formData.dietary_tags) ? formData.dietary_tags : [],
        customer_customization: {
          ingredientsToAdd: formData.ingredientsToAdd,
          ingredientsToRemove: formData.ingredientsToRemove
        }
      };

      const { data: insertedResult, error } = isEditing 
        ? await supabase.from('menu_items').update(payload).eq('id', id).select('id').single()
        : await supabase.from('menu_items').insert([payload]).select('id').single();

      if (error) throw error;

      const menuItemId = (isEditing ? id : insertedResult?.id) as string;
      if (menuItemId && variantGroups.length > 0) {
        const existingGroupIds = new Set(variantGroups.filter(g => g.id).map(g => g.id!));
        const insertedOptionIdsByGroup = new Map<string, Set<string>>();
        for (const group of variantGroups) {
          let groupId: string;
          if (group.id && existingGroupIds.has(group.id)) {
            const { error: updErr } = await supabase.from('variant_groups').update({
              name: group.name,
              selection: group.selection || 'individual',
              max_selection: group.selection === 'multiple' && group.max_selection != null && group.max_selection > 0 ? group.max_selection : null,
              required: group.required,
              sort_order: group.sort_order
            }).eq('id', group.id);
            if (updErr) throw updErr;
            groupId = group.id;
          } else {
            const { data: newGroup, error: insErr } = await supabase.from('variant_groups').insert({
              menu_item_id: menuItemId,
              name: group.name,
              selection: group.selection || 'individual',
              max_selection: group.selection === 'multiple' && group.max_selection != null && group.max_selection > 0 ? group.max_selection : null,
              required: group.required,
              sort_order: group.sort_order
            }).select('id').single();
            if (insErr) throw insErr;
            if (!newGroup?.id) throw new Error('No se pudo crear el grupo de variantes');
            groupId = newGroup.id;
            group.id = groupId;
          }
          const existingOptIds = new Set(group.options.filter(o => o.id).map(o => o.id!));
          const insertedIds = new Set<string>();
          for (const opt of group.options) {
            if (opt.id && existingOptIds.has(opt.id)) {
              const { error: optUpdErr } = await supabase.from('variant_options').update({
                name: opt.name,
                description: (opt.description ?? '').trim() || null,
                price_type: opt.price_type,
                price_amount: opt.price_amount,
                sort_order: opt.sort_order
              }).eq('id', opt.id);
              if (optUpdErr) throw optUpdErr;
            } else {
              const { data: newOpt, error: optInsErr } = await supabase.from('variant_options').insert({
                variant_group_id: groupId,
                name: (opt.name ?? '').trim() || 'Opción',
                description: (opt.description ?? '').trim() || null,
                price_type: opt.price_type,
                price_amount: Number(opt.price_amount) ?? 0,
                sort_order: Number(opt.sort_order) ?? 0
              }).select('id').single();
              if (optInsErr) throw optInsErr;
              if (newOpt?.id) insertedIds.add(newOpt.id);
            }
          }
          insertedOptionIdsByGroup.set(groupId, insertedIds);
        }
        if (isEditing) {
          const { data: currentGroups } = await supabase.from('variant_groups').select('id').eq('menu_item_id', menuItemId);
          const keptGroupIds = new Set(variantGroups.map(g => g.id).filter(Boolean));
          for (const g of currentGroups || []) {
            if (!keptGroupIds.has(g.id)) {
              await supabase.from('variant_groups').delete().eq('id', g.id);
            }
          }
          for (const group of variantGroups) {
            if (!group.id) continue;
            const { data: currentOpts } = await supabase.from('variant_options').select('id').eq('variant_group_id', group.id);
            const keptOptIds = new Set(group.options.map(o => o.id).filter(Boolean));
            const justInserted = insertedOptionIdsByGroup.get(group.id) ?? new Set();
            for (const o of currentOpts || []) {
              if (!keptOptIds.has(o.id) && !justInserted.has(o.id)) {
                await supabase.from('variant_options').delete().eq('id', o.id);
              }
            }
          }
        }
      }

      setSuccess(true);
      if (isEditing) await fetchItemToEdit();
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
            <span className="text-sm font-bold text-gray-700">Disponible</span>
            <button
              type="button"
              role="switch"
              aria-checked={(formData as any).availability ?? formData.is_available}
              onClick={() => {
                const v = !((formData as any).availability ?? formData.is_available);
                setFormData(prev => ({ ...prev, availability: v, is_available: v } as any));
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors ${(formData as any).availability ?? formData.is_available ? 'bg-emerald-500 border-emerald-500' : 'bg-rose-500 border-rose-500'}`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform ${(formData as any).availability ?? formData.is_available ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </label>
          <div className="flex items-center justify-between gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-all">
            <div>
              <span className="text-sm font-bold text-gray-700 block">Cantidad en stock</span>
              <span className="text-xs text-gray-500">Vacío = sin control de stock. Si tiene valor, se resta 1 por venta y al llegar a 0 se pone no disponible.</span>
            </div>
            <input
              type="number"
              min="0"
              placeholder="—"
              value={(formData as any).stock_quantity ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : parseInt(e.target.value, 10);
                setFormData(prev => ({ ...prev, stock_quantity: v } as any));
              }}
              className="w-24 px-3 py-2 text-sm font-bold border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </section>

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

            {formData.category_id && sectionHeaders.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Subtítulo</label>
                <select
                  name="section_id"
                  value={formData.section_id ?? ''}
                  onChange={handleInputChange}
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none font-bold appearance-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Sin subtítulo</option>
                  {sectionHeaders.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Precio {hasReplacePriceVariants ? '(opcional)' : '*'}</label>
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

          <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-4 text-violet-600">
                  <Layers size={20} />
                  <h2 className="text-sm font-black uppercase tracking-widest">Variantes (Tamaño, Salsa, etc.)</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setVariantGroups(prev => [...prev, { name: '', selection: 'individual', max_selection: null, required: true, sort_order: prev.length, options: [] }])}
                  className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-200 transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Agregar grupo
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 p-4 bg-violet-50/50 rounded-2xl border border-violet-100">
                <div className="flex items-center gap-2">
                  <Copy size={16} className="text-violet-600" />
                  <select
                    value=""
                    onChange={e => { const v = e.target.value; if (v) handleApplyTemplate(v); e.target.value = ''; }}
                    disabled={!variantTemplates.length || applyingTemplate}
                    className="p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-bold text-violet-800 outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
                  >
                    <option value="">Aplicar plantilla...</option>
                    {variantTemplates.filter(t => t.groups?.length).map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.groups.length} grupos)</option>
                    ))}
                  </select>
                </div>
                <div className="h-4 w-px bg-violet-200" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <BookmarkPlus size={16} className="text-violet-600 shrink-0" />
                  <input
                    value={templateNameInput}
                    onChange={e => setTemplateNameInput(e.target.value)}
                    placeholder="Guardar actual como plantilla (ej: Pizza clásica)"
                    className="flex-1 min-w-0 p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    disabled={savingTemplate || !templateNameInput.trim() || !variantGroups.some(g => g.name.trim() && g.options.length)}
                    className="px-4 py-2.5 bg-violet-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-violet-700 disabled:opacity-50 transition-all shrink-0"
                  >
                    {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-4">
                <strong>replace</strong>: precio total (ej. pizzas por tamaño). <strong>add</strong>: recargo sobre precio base (ej. salsas especiales).
              </p>
              <div className="space-y-6">
                {variantGroups.map((group, gi) => (
                  <div key={gi} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <GripVertical size={18} className="text-gray-400" />
                      <input
                        value={group.name}
                        onChange={e => setVariantGroups(prev => {
                          const next = [...prev];
                          next[gi] = { ...next[gi], name: e.target.value };
                          return next;
                        })}
                        placeholder="Nombre del grupo (ej: Tamaño, Salsa)"
                        className="flex-1 min-w-[140px] p-3 bg-white border-2 border-transparent rounded-xl font-bold outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-gray-500 whitespace-nowrap">Tipo de selección:</span>
                        <select
                          value={group.selection || 'individual'}
                          onChange={e => setVariantGroups(prev => {
                            const next = [...prev];
                            next[gi] = { ...next[gi], selection: e.target.value as VariantSelectionType, max_selection: e.target.value === 'multiple' ? next[gi].max_selection : null };
                            return next;
                          })}
                          className="p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                        >
                          <option value="individual">Individual</option>
                          <option value="multiple">Múltiple</option>
                        </select>
                      </div>
                      {group.selection === 'multiple' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-gray-500 whitespace-nowrap">Máx. selecciones:</span>
                          <input
                            type="number"
                            min={1}
                            value={group.max_selection ?? ''}
                            onChange={e => {
                              const v = e.target.value;
                              const n = v === '' ? null : Math.max(1, parseInt(v, 10) || 1);
                              setVariantGroups(prev => {
                                const next = [...prev];
                                next[gi] = { ...next[gi], max_selection: n };
                                return next;
                              });
                            }}
                            placeholder="Sin límite"
                            className="w-20 p-2.5 bg-white border border-violet-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-violet-500"
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-600">
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={e => setVariantGroups(prev => {
                            const next = [...prev];
                            next[gi] = { ...next[gi], required: e.target.checked };
                            return next;
                          })}
                          className="w-4 h-4 rounded border-gray-300 text-violet-600"
                        />
                        Obligatorio
                      </label>
                      <button
                        type="button"
                        onClick={() => setVariantGroups(prev => prev.filter((_, i) => i !== gi))}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="pl-6 space-y-3">
                      {group.options.map((opt, oi) => (
                        <div key={oi} className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              value={opt.name}
                              onChange={e => setVariantGroups(prev => {
                                const next = [...prev];
                                next[gi].options = [...next[gi].options];
                                next[gi].options[oi] = { ...next[gi].options[oi], name: e.target.value };
                                return next;
                              })}
                              placeholder="Nombre opción"
                              className="w-36 p-2 bg-gray-50 border rounded-lg text-sm font-medium"
                            />
                            <select
                              value={opt.price_type}
                              onChange={e => setVariantGroups(prev => {
                                const next = [...prev];
                                next[gi].options = [...next[gi].options];
                                next[gi].options[oi] = { ...next[gi].options[oi], price_type: e.target.value as VariantPriceType };
                                return next;
                              })}
                              className="p-2 bg-gray-50 border rounded-lg text-sm font-medium"
                            >
                              <option value="replace">Precio total</option>
                              <option value="add">Recargo</option>
                            </select>
                            <input
                              type="number"
                              value={opt.price_amount || ''}
                              onChange={e => setVariantGroups(prev => {
                                const next = [...prev];
                                next[gi].options = [...next[gi].options];
                                next[gi].options[oi] = { ...next[gi].options[oi], price_amount: Number(e.target.value) || 0 };
                                return next;
                              })}
                              placeholder="Monto"
                              className="w-24 p-2 bg-gray-50 border rounded-lg text-sm font-medium"
                            />
                            <span className="text-xs text-gray-500">$</span>
                            <button
                              type="button"
                              onClick={() => setVariantGroups(prev => {
                                const next = [...prev];
                                next[gi].options = next[gi].options.filter((_, i) => i !== oi);
                                return next;
                              })}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <input
                            value={opt.description ?? ''}
                            onChange={e => setVariantGroups(prev => {
                              const next = [...prev];
                              next[gi].options = [...next[gi].options];
                              next[gi].options[oi] = { ...next[gi].options[oi], description: e.target.value };
                              return next;
                            })}
                            placeholder="Descripción (opcional)"
                            className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-medium"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setVariantGroups(prev => {
                          const next = [...prev];
                          next[gi].options = [...next[gi].options, { name: '', description: '', price_type: 'add', price_amount: 0, sort_order: next[gi].options.length }];
                          return next;
                        })}
                        className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-1"
                      >
                        <Plus size={12} /> Agregar opción
                      </button>
                    </div>
                  </div>
                ))}
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
        </div>
      </div>
    </div>
  );
};

export default CreateItemPage;
