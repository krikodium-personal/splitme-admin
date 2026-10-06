
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';
import { Trash2, GripVertical, Upload, Plus, Eye, EyeOff, Loader2, Check, X, Link2, LayoutGrid, ShoppingCart, ImagePlus, Megaphone } from 'lucide-react';

type Placement = 'home' | 'category';

interface Banner {
  id: string;
  restaurant_id: string;
  image_url: string | null;
  title: string | null;
  description: string | null;
  target_category_id: string | null;
  placement: Placement | null;
  display_category_id: string | null;
  cta_menu_item_id: string | null;
  cta_label: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

interface CategoryOption {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number | null;
}

interface MenuItemOption {
  id: string;
  name: string;
  category_id: string | null;
  price: number | null;
}

type EditableField = 'title' | 'description' | 'cta_label';
type EditingField = { id: string; field: EditableField };

const placementOf = (b: Banner): Placement => b.placement ?? 'home';

const BannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [tab, setTab] = useState<Placement>('home');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingRef = useRef<EditingField | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageForBannerRef = useRef<string | null>(null);
  const bannerImageInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    setLoading(true);
    const [{ data }, { data: cats }, { data: items }] = await Promise.all([
      supabase
        .from('banners')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('categories')
        .select('id, name, parent_id, sort_order')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select('id, name, category_id, price')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .order('sort_order', { ascending: true }),
    ]);
    setBanners(data || []);
    setCategories(cats || []);
    setMenuItems(items || []);
    setLoading(false);
  };

  const visibleBanners = banners.filter(b => placementOf(b) === tab);
  const topCategories = categories.filter(c => !c.parent_id);
  const subcategoriesOf = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const updateBanner = async (banner: Banner, patch: Partial<Banner>) => {
    const { error } = await supabase.from('banners').update(patch).eq('id', banner.id);
    if (!error) setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, ...patch } : b));
  };

  const nextSortOrder = () => (banners.length > 0 ? Math.max(...banners.map(b => b.sort_order)) + 1 : 0);

  const uploadImage = async (file: File) => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${CURRENT_RESTAURANT!.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('banners').upload(filePath, file);
    if (uploadError) { console.error('Upload error:', uploadError); return null; }
    return supabase.storage.from('banners').getPublicUrl(filePath).data.publicUrl;
  };

  const removeStoredImage = async (imageUrl: string | null) => {
    const pathPart = imageUrl?.split('/banners/')[1];
    if (pathPart) await supabase.storage.from('banners').remove([pathPart]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (!files.length || !CURRENT_RESTAURANT?.id) return;
    setUploading(true);
    let sortOrder = nextSortOrder();
    for (const file of files) {
      const publicUrl = await uploadImage(file);
      if (!publicUrl) continue;
      const { data: inserted } = await supabase
        .from('banners')
        .insert({ restaurant_id: CURRENT_RESTAURANT.id, image_url: publicUrl, sort_order: sortOrder++, active: true, placement: 'home' })
        .select()
        .single();
      if (inserted) setBanners(prev => [...prev, inserted as unknown as Banner]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const createCategoryBanner = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    setCreating(true);
    const { data: inserted } = await supabase
      .from('banners')
      .insert({ restaurant_id: CURRENT_RESTAURANT.id, placement: 'category', title: 'Nuevo banner', sort_order: nextSortOrder(), active: true })
      .select()
      .single();
    if (inserted) setBanners(prev => [...prev, inserted as unknown as Banner]);
    setCreating(false);
  };

  const pickBannerImage = (banner: Banner) => {
    imageForBannerRef.current = banner.id;
    bannerImageInputRef.current?.click();
  };

  const handleBannerImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const banner = banners.find(b => b.id === imageForBannerRef.current);
    if (file && banner) {
      setUploadingImageFor(banner.id);
      const publicUrl = await uploadImage(file);
      if (publicUrl) {
        await removeStoredImage(banner.image_url);
        await updateBanner(banner, { image_url: publicUrl });
      }
      setUploadingImageFor(null);
    }
    imageForBannerRef.current = null;
    if (bannerImageInputRef.current) bannerImageInputRef.current.value = '';
  };

  const removeBannerImage = async (banner: Banner) => {
    await removeStoredImage(banner.image_url);
    await updateBanner(banner, { image_url: null });
  };

  const deleteBanner = async (banner: Banner) => {
    if (!confirm('¿Eliminar este banner?')) return;
    await removeStoredImage(banner.image_url);
    await supabase.from('banners').delete().eq('id', banner.id);
    setBanners(prev => prev.filter(b => b.id !== banner.id));
  };

  const startEditing = (banner: Banner, field: EditableField) => {
    editingRef.current = { id: banner.id, field };
    setEditing({ id: banner.id, field });
    setEditValue(banner[field] || '');
  };

  const cancelEditing = () => {
    editingRef.current = null;
    setEditing(null);
  };

  const saveField = async () => {
    const current = editingRef.current;
    if (!current) return;
    editingRef.current = null;
    const { id, field } = current;
    const value = editValue.trim() || null;
    setEditing(null);
    const banner = banners.find(b => b.id === id);
    if (!banner || banner[field] === value) return;
    setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    const { error } = await supabase.from('banners').update({ [field]: value }).eq('id', id);
    if (error) {
      setBanners(prev => prev.map(b => b.id === id ? { ...b, [field]: banner[field] } : b));
      alert('No se pudo guardar el texto. Probá de nuevo.');
    }
  };

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null; dragOverItem.current = null; return;
    }
    const reordered = [...visibleBanners];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOverItem.current, 0, dragged);
    const sortById = new Map(reordered.map((b, i) => [b.id, i]));
    setBanners(prev =>
      prev
        .map(b => (sortById.has(b.id) ? { ...b, sort_order: sortById.get(b.id)! } : b))
        .sort((a, b) => a.sort_order - b.sort_order)
    );
    dragItem.current = null; dragOverItem.current = null;
    await Promise.all(reordered.map((b, i) => supabase.from('banners').update({ sort_order: i }).eq('id', b.id)));
  };

  const categorySelectOptions = (allLabel: string) =>
    topCategories.map(cat => {
      const subs = subcategoriesOf(cat.id);
      return subs.length === 0 ? (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ) : (
        <optgroup key={cat.id} label={cat.name}>
          <option value={cat.id}>{cat.name} ({allLabel})</option>
          {subs.map(sub => (
            <option key={sub.id} value={sub.id}>{cat.name} › {sub.name}</option>
          ))}
        </optgroup>
      );
    });

  const menuItemSelectOptions = () => {
    const categoryName = (id: string | null) => categories.find(c => c.id === id)?.name || 'Sin categoría';
    const groups = new Map<string, MenuItemOption[]>();
    menuItems.forEach(item => {
      const key = categoryName(item.category_id);
      groups.set(key, [...(groups.get(key) || []), item]);
    });
    return [...groups.entries()].map(([groupName, items]) => (
      <optgroup key={groupName} label={groupName}>
        {items.map(item => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </optgroup>
    ));
  };

  const renderEditableText = (banner: Banner, field: EditableField, opts: { placeholder: string; emptyLabel: string; className: string; inputClassName: string }) =>
    editing?.id === banner.id && editing.field === field ? (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === 'Enter') { e.preventDefault(); saveField(); }
            if (e.key === 'Escape') cancelEditing();
          }}
          onBlur={saveField}
          className={`flex-1 border border-indigo-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 ${opts.inputClassName}`}
          placeholder={opts.placeholder}
        />
        <button onMouseDown={e => e.preventDefault()} onClick={saveField} className="p-1 text-green-600 hover:bg-green-50 rounded-lg"><Check size={16} /></button>
        <button onMouseDown={e => e.preventDefault()} onClick={cancelEditing} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
      </div>
    ) : (
      <p className={`cursor-pointer truncate ${opts.className}`} onClick={() => startEditing(banner, field)}>
        {banner[field] || <span className="text-gray-300 font-normal italic">{opts.emptyLabel}</span>}
      </p>
    );

  const renderActions = (banner: Banner) => (
    <div className="flex items-center gap-2 shrink-0">
      <button onClick={() => updateBanner(banner, { active: !banner.active })} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title={banner.active ? 'Ocultar' : 'Mostrar'}>
        {banner.active ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
      <button onClick={() => deleteBanner(banner)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">
        <Trash2 size={18} />
      </button>
    </div>
  );

  const renderHomeBanner = (banner: Banner, index: number) => (
    <div className="flex items-center gap-4">
      <GripVertical size={20} className="text-gray-300 shrink-0 cursor-grab" />
      <img
        src={banner.image_url ?? undefined}
        alt={`Banner ${index + 1}`}
        className="w-32 h-16 object-cover rounded-xl shrink-0 bg-gray-100"
      />
      <div className="flex-1 min-w-0 space-y-2">
        {renderEditableText(banner, 'title', { placeholder: 'Título del banner', emptyLabel: '+ Agregar título', className: 'text-sm font-semibold text-gray-800 hover:text-indigo-600', inputClassName: 'text-sm font-medium' })}
        {renderEditableText(banner, 'description', { placeholder: 'Texto del banner', emptyLabel: '+ Agregar texto', className: 'text-xs text-gray-400 hover:text-indigo-500', inputClassName: 'text-xs' })}
        <div className="flex items-center gap-2">
          <Link2 size={14} className={banner.target_category_id ? 'text-indigo-500 shrink-0' : 'text-gray-300 shrink-0'} />
          <select
            value={banner.target_category_id || ''}
            onChange={e => updateBanner(banner, { target_category_id: e.target.value || null })}
            className={`text-xs rounded-lg border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 max-w-full truncate ${banner.target_category_id ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-400'}`}
          >
            <option value="">Sin link</option>
            {categorySelectOptions('toda la categoría')}
          </select>
        </div>
      </div>
      {renderActions(banner)}
    </div>
  );

  const renderCategoryBanner = (banner: Banner) => {
    const missingCategory = !banner.display_category_id;
    return (
      <div className="flex items-start gap-4">
        <GripVertical size={20} className="text-gray-300 shrink-0 cursor-grab mt-1" />
        <div className="w-32 shrink-0 space-y-1">
          {banner.image_url ? (
            <div className="relative group">
              <img src={banner.image_url} alt="" className="w-32 h-20 object-cover rounded-xl bg-gray-100" />
              <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button onClick={() => pickBannerImage(banner)} className="p-1.5 rounded-lg bg-white/90 text-gray-700" title="Cambiar imagen"><Upload size={14} /></button>
                <button onClick={() => removeBannerImage(banner)} className="p-1.5 rounded-lg bg-white/90 text-red-500" title="Quitar imagen"><Trash2 size={14} /></button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => pickBannerImage(banner)}
              disabled={uploadingImageFor === banner.id}
              className="w-32 h-20 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex flex-col items-center justify-center text-[11px] gap-1"
            >
              {uploadingImageFor === banner.id ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              Imagen (opcional)
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {renderEditableText(banner, 'title', { placeholder: 'Ej: Vino del mes', emptyLabel: '+ Agregar título', className: 'text-sm font-semibold text-gray-800 hover:text-indigo-600', inputClassName: 'text-sm font-medium' })}
          {renderEditableText(banner, 'description', { placeholder: 'Ej: Finca La Anita 2x1 en Cabernet Franc', emptyLabel: '+ Agregar texto', className: 'text-xs text-gray-500 hover:text-indigo-500', inputClassName: 'text-xs' })}

          <div className="flex items-center gap-2">
            <LayoutGrid size={14} className={missingCategory ? 'text-amber-500 shrink-0' : 'text-indigo-500 shrink-0'} />
            <span className="text-xs text-gray-500 shrink-0">Mostrar en</span>
            <select
              value={banner.display_category_id || ''}
              onChange={e => updateBanner(banner, { display_category_id: e.target.value || null })}
              className={`text-xs rounded-lg border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 max-w-full truncate ${missingCategory ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}
            >
              <option value="">Elegí una categoría…</option>
              {categorySelectOptions('al ver "Todos"')}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ShoppingCart size={14} className={banner.cta_menu_item_id ? 'text-indigo-500 shrink-0' : 'text-gray-300 shrink-0'} />
            <span className="text-xs text-gray-500 shrink-0">Botón agrega</span>
            <select
              value={banner.cta_menu_item_id || ''}
              onChange={e => updateBanner(banner, { cta_menu_item_id: e.target.value || null })}
              className={`text-xs rounded-lg border px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 max-w-full truncate ${banner.cta_menu_item_id ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-white text-gray-400'}`}
            >
              <option value="">Sin botón</option>
              {menuItemSelectOptions()}
            </select>
          </div>

          {banner.cta_menu_item_id && (
            <div className="flex items-center gap-2 pl-[22px]">
              <span className="text-xs text-gray-500 shrink-0">Texto del botón:</span>
              <div className="flex-1 min-w-0">
                {renderEditableText(banner, 'cta_label', { placeholder: 'Agregar al pedido', emptyLabel: 'Agregar al pedido (por defecto)', className: 'text-xs text-indigo-600 hover:text-indigo-800', inputClassName: 'text-xs' })}
              </div>
            </div>
          )}

          {missingCategory && (
            <p className="text-[11px] text-amber-600">Este banner no se muestra hasta que elijas una categoría.</p>
          )}
        </div>
        {renderActions(banner)}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tab === 'home'
              ? 'Se muestran en el carrusel hero de la pantalla de inicio'
              : 'Promociones que aparecen arriba de los productos al entrar a una categoría, con botón para agregar al pedido'}
          </p>
        </div>
        {tab === 'home' ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {uploading ? 'Subiendo...' : 'Agregar banner'}
          </button>
        ) : (
          <button
            onClick={createCategoryBanner}
            disabled={creating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Nuevo banner de categoría
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        <input ref={bannerImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerImageChange} />
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([
          { id: 'home', label: 'Inicio' },
          { id: 'category', label: 'Categorías' },
        ] as { id: Placement; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); cancelEditing(); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-gray-400">{banners.filter(b => placementOf(b) === t.id).length}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" /> Cargando...
        </div>
      ) : visibleBanners.length === 0 ? (
        tab === 'home' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center h-48 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-500"
          >
            <Upload size={32} className="mb-3" />
            <p className="font-medium">Clic para subir tu primer banner</p>
            <p className="text-sm mt-1">PNG, JPG, WEBP — ancho recomendado: 800px+</p>
          </div>
        ) : (
          <div
            onClick={createCategoryBanner}
            className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center h-48 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-gray-400 hover:text-indigo-500 text-center px-6"
          >
            <Megaphone size={32} className="mb-3" />
            <p className="font-medium">Creá tu primer banner de categoría</p>
            <p className="text-sm mt-1">Ej: en “Bebidas con alcohol”, “Vino del mes — Finca La Anita 2x1 en Cabernet Franc” con botón “Agregar al pedido”</p>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {visibleBanners.map((banner, index) => (
            <div
              key={banner.id}
              draggable={!editing}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm transition-opacity ${!banner.active ? 'opacity-50' : ''}`}
            >
              {tab === 'home' ? renderHomeBanner(banner, index) : renderCategoryBanner(banner)}
            </div>
          ))}

          {tab === 'home' ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload size={16} />
              Subir más banners
            </button>
          ) : (
            <button
              onClick={createCategoryBanner}
              disabled={creating}
              className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-4 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} />
              Nuevo banner de categoría
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BannersPage;
