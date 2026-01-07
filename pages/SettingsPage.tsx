
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, FolderTree, LayoutGrid, Layers, Store, Edit3, Check, X, 
  AlertCircle, AlertTriangle, GripVertical, Loader2, Camera, UploadCloud, 
  Save, MapPin, CheckCircle2, CreditCard, Link as LinkIcon, RefreshCw, Zap,
  Key, ShieldCheck, ExternalLink, Eye, EyeOff, User
} from 'lucide-react';
import { Category, Restaurant, setGlobalRestaurant, PaymentConfig } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface DeleteConfirmState {
  show: boolean;
  id: string | null;
  name: string;
  type: 'category' | 'subcategory';
}

interface SettingsPageProps {
  restaurant: Restaurant | null;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ restaurant }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'taxonomy' | 'restaurant' | 'payments'>('taxonomy');
  
  // Estados para Categorías
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Estados para Información del Restaurante
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingRest, setSavingRest] = useState(false);
  const [restMessage, setRestMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Estados para Mercado Pago
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [manualPublicKey, setManualPublicKey] = useState('');
  const [manualAccessToken, setManualAccessToken] = useState('');
  const [manualMpUserId, setManualMpUserId] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estados para Transferencia
  const [transferConfig, setTransferConfig] = useState<PaymentConfig | null>(null);
  const [transferCBU, setTransferCBU] = useState('');
  const [transferAccountNumber, setTransferAccountNumber] = useState('');
  const [transferAlias, setTransferAlias] = useState('');
  const [transferBank, setTransferBank] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferMessage, setTransferMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const bankOptions = [
    'Banco Galicia',
    'Banco Macro',
    'Banco Provincia',
    'Banco Ciudad',
    'Banco Rio'
  ];

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    show: false,
    id: null,
    name: '',
    type: 'category'
  });

  useEffect(() => {
    if (isSupabaseConfigured) {
      if (restaurant) {
        setRestName(restaurant.name);
        setRestAddress(restaurant.address || '');
        setPreviewUrl(restaurant.logo_url || null);
        
        fetchCategories();
        fetchPaymentConfig();
      }
    } else {
      setLoading(false);
      setErrorMsg("Configura Supabase para gestionar el restaurante.");
    }
  }, [restaurant]);

  const fetchPaymentConfig = async () => {
    if (!restaurant?.id) return;
    try {
      // Cargar configuración de Mercado Pago
      const { data: mpData, error: mpError } = await supabase
        .from('payment_configs')
        .select('id, restaurant_id, token_cbu, key_alias, user_account, provider, is_active, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('provider', 'mercadopago')
        .maybeSingle();
      
      if (mpError) throw mpError;
      if (mpData) {
        setPaymentConfig(mpData);
        setManualPublicKey(mpData.key_alias || ''); // key_alias para public key de MP
        setManualAccessToken(mpData.token_cbu || ''); // token_cbu para access token de MP
        setManualMpUserId(mpData.user_account || ''); // user_account para user ID de MP
      }

      // Cargar configuración de Transferencia (buscar por cualquier banco de la lista)
      const { data: transferData, error: transferError } = await supabase
        .from('payment_configs')
        .select('id, restaurant_id, token_cbu, key_alias, user_account, provider, is_active, created_at')
        .eq('restaurant_id', restaurant.id)
        .in('provider', bankOptions)
        .maybeSingle();
      
      if (transferError) throw transferError;
      if (transferData) {
        setTransferConfig(transferData);
        setTransferCBU(transferData.token_cbu || ''); // token_cbu contiene el CBU
        setTransferAccountNumber(transferData.user_account || ''); // user_account contiene el Nro de cuenta
        setTransferAlias(transferData.key_alias || ''); // key_alias contiene el alias
        setTransferBank(transferData.provider || ''); // provider contiene el nombre del banco
      }
    } catch (err: any) {
      console.error("Error al cargar config de pagos:", err.message || err);
    }
  };

  const handleSaveManualConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    if (!manualPublicKey.trim() || !manualAccessToken.trim()) {
      setPaymentMessage({ type: 'error', text: 'Por favor, completa los campos de credenciales requeridos.' });
      return;
    }

    setSavingPayment(true);
    setPaymentMessage(null);

    try {
      // Verificar si ya existe una configuración de Mercado Pago para este restaurante
      const { data: existingMP } = await supabase
        .from('payment_configs')
        .select('id, provider')
        .eq('restaurant_id', restaurant.id)
        .eq('provider', 'mercadopago')
        .maybeSingle();

      if (existingMP) {
        setPaymentMessage({ 
          type: 'error', 
          text: 'Ya existe una configuración de Mercado Pago para este restaurante. Por favor, elimina la configuración existente primero usando el botón "Eliminar Credenciales".' 
        });
        setSavingPayment(false);
        return;
      }

      // Objeto de datos limpio para el upsert basado en la restricción 'restaurant_id'
      const payload = {
        restaurant_id: restaurant.id,
        token_cbu: manualAccessToken.trim(), // token_cbu para access token de MP
        key_alias: manualPublicKey.trim(), // key_alias para public key de MP
        user_account: manualMpUserId.trim() || null, // user_account para user ID de MP (opcional)
        provider: 'mercadopago',
        is_active: true
      };

      // Intentar insertar (no podemos actualizar sin políticas RLS)
      const { data, error } = await supabase
        .from('payment_configs')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("DEBUG Error al guardar config de pago:", error);
        // Manejo específico para errores de caché de esquema de PostgREST
        if (error.message?.toLowerCase().includes('schema cache')) {
           setPaymentMessage({ 
             type: 'error', 
             text: 'La estructura de la base de datos ha cambiado. Por favor, pulsa F5 o recarga la página para sincronizar el nuevo esquema.' 
           });
           setSavingPayment(false);
           return;
        }
        throw error;
      }
      
      setPaymentConfig(data);
      setPaymentMessage({ type: 'success', text: 'Configuración vinculada correctamente.' });
      setErrorMsg(null);
      
      // Refrescamos localmente
      fetchPaymentConfig();
    } catch (err: any) {
      console.error("DEBUG Catch al guardar pagos:", err);
      setPaymentMessage({ 
        type: 'error', 
        text: `Error al guardar: ${err.message || 'No se pudo guardar la configuración.'}` 
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDisconnectMP = async () => {
    if (!restaurant?.id || !paymentConfig) return;
    if (!confirm("¿Eliminar las credenciales de Mercado Pago? Los cobros automáticos dejarán de funcionar.")) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('payment_configs')
        .delete()
        .eq('id', paymentConfig.id);
      
      if (error) throw error;
      setPaymentConfig(null);
      setManualPublicKey('');
      setManualAccessToken('');
      setManualMpUserId('');
      setPaymentMessage({ type: 'success', text: 'Credenciales eliminadas con éxito.' });
    } catch (err: any) {
      alert("Error al desvincular: " + (err.message || "Error desconocido"));
    } finally {
      setActionLoading(false);
    }
  };

  // Handler para paste sin formato
  const handlePastePlainText = (e: React.ClipboardEvent<HTMLInputElement>, setter: (value: string) => void) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain');
    setter(pastedText);
  };

  // Handler para CBU que solo acepta números
  const handleCBUChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Solo números
    if (value.length <= 22) {
      setTransferCBU(value);
    }
  };

  // Handler para paste en CBU
  const handleCBUPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text/plain').replace(/\D/g, ''); // Solo números
    if (pastedText.length <= 22) {
      setTransferCBU(pastedText);
    } else {
      setTransferCBU(pastedText.substring(0, 22));
    }
  };

  const handleSaveTransferConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    // Validar banco seleccionado
    if (!transferBank.trim()) {
      setTransferMessage({ type: 'error', text: 'Por favor, selecciona un banco.' });
      return;
    }

    // Validar CBU
    if (transferCBU.trim().length !== 22) {
      setTransferMessage({ type: 'error', text: 'El CBU debe tener exactamente 22 caracteres numéricos.' });
      return;
    }

    setSavingTransfer(true);
    setTransferMessage(null);

    try {
      // Verificar si ya existe una configuración de transferencia (cualquier banco) para este restaurante
      const { data: existingTransfer } = await supabase
        .from('payment_configs')
        .select('id, provider')
        .eq('restaurant_id', restaurant.id)
        .in('provider', bankOptions)
        .maybeSingle();

      if (existingTransfer) {
        setTransferMessage({ 
          type: 'error', 
          text: `Ya existe una configuración de Transferencia (${existingTransfer.provider}) para este restaurante. Solo se permite una configuración de Transferencia por restaurante.` 
        });
        setSavingTransfer(false);
        return;
      }

      // Guardar el banco en provider y el número de cuenta en user_account
      const payload = {
        restaurant_id: restaurant.id,
        token_cbu: transferCBU.trim(), // token_cbu contiene el CBU
        key_alias: transferAlias.trim(), // key_alias contiene el alias
        user_account: transferAccountNumber.trim(), // user_account contiene el Nro de cuenta
        provider: transferBank.trim(), // provider contiene el nombre del banco
        is_active: true
      };

      // Intentar insertar nuevo registro (no podemos actualizar sin políticas RLS)
      const { data, error } = await supabase
        .from('payment_configs')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("Error al guardar config de transferencia:", error);
        if (error.message?.toLowerCase().includes('schema cache')) {
           setTransferMessage({ 
             type: 'error', 
             text: 'La estructura de la base de datos ha cambiado. Por favor, pulsa F5 o recarga la página para sincronizar el nuevo esquema.' 
           });
           setSavingTransfer(false);
           return;
        }
        throw error;
      }
      
      setTransferConfig(data);
      setTransferMessage({ type: 'success', text: 'Cuenta de transferencia guardada correctamente.' });
      setErrorMsg(null);
      
      // Limpiar formulario después de guardar
      setTransferCBU('');
      setTransferAccountNumber('');
      setTransferAlias('');
      setTransferBank('');
      
      fetchPaymentConfig();
    } catch (err: any) {
      console.error("Error al guardar transferencia:", err);
      // Manejo para errores de restricción única (por si la restricción no es compuesta)
      if (err.message?.includes('duplicate key') || err.message?.includes('unique constraint')) {
        setTransferMessage({ 
          type: 'error', 
          text: 'Error: La restricción única en la base de datos no permite múltiples métodos de pago. Asegúrate de que la restricción única sea compuesta (restaurant_id, provider) en lugar de solo restaurant_id.' 
        });
      } else {
        setTransferMessage({ 
          type: 'error', 
          text: `Error al guardar: ${err.message || 'No se pudo guardar la configuración.'}` 
        });
      }
    } finally {
      setSavingTransfer(false);
    }
  };

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateRestaurantInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;
    setSavingRest(true);
    setRestMessage(null);

    try {
      let finalLogoUrl = previewUrl;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${restaurant.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, selectedFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
        finalLogoUrl = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('restaurants')
        .update({ name: restName, address: restAddress, logo_url: finalLogoUrl })
        .eq('id', restaurant.id);

      if (error) throw error;

      const updatedRest: Restaurant = { ...restaurant, name: restName, address: restAddress, logo_url: finalLogoUrl || undefined };
      setGlobalRestaurant(updatedRest);
      setRestMessage({ type: 'success', text: 'Información del local actualizada correctamente.' });
    } catch (err: any) {
      setRestMessage({ type: 'error', text: err.message || 'Error al guardar cambios.' });
    } finally {
      setSavingRest(false);
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
          parent_id: null,
          sort_order: maxOrder + 1
        }])
        .select();
      if (error) throw error;
      setNewCategoryName('');
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
          parent_id: selectedCategoryId,
          sort_order: maxOrder + 1
        }]);
      if (error) throw error;
      setNewSubCategoryName('');
      await fetchCategories();
    } catch (err: any) {
      alert(`Error al añadir subcategoría: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const updateCategoryName = async (id: string) => {
    if (!editingName.trim() || !restaurant?.id) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editingName.trim() })
        .eq('id', id)
        .eq('restaurant_id', restaurant.id);
      if (error) throw error;
      setEditingCategoryId(null);
      setEditingName('');
      await fetchCategories();
    } catch (err: any) {
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDragStart = (id: string) => setDraggingId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); if (id !== draggingId) setDragOverId(id); };
  const handleDragLeave = () => setDragOverId(null);

  const handleDrop = async (e: React.DragEvent, targetId: string, isSub: boolean) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId || !restaurant?.id) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const list = (isSub ? categories.filter(c => c.parent_id === selectedCategoryId) : categories.filter(c => !c.parent_id)).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const dragIndex = list.findIndex(c => c.id === draggingId);
    const dropIndex = list.findIndex(c => c.id === targetId);
    if (dragIndex === -1 || dropIndex === -1) { setDraggingId(null); setDragOverId(null); return; }
    const newList = [...list];
    const [movedItem] = newList.splice(dragIndex, 1);
    newList.splice(dropIndex, 0, movedItem);
    const itemsWithNewOrder = newList.map((item, index) => ({ ...item, sort_order: index + 1 }));
    const otherCategories = categories.filter(c => !newList.find(nl => nl.id === c.id));
    setCategories([...otherCategories, ...itemsWithNewOrder].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    setDraggingId(null);
    setDragOverId(null);
    setActionLoading(true);
    try {
      const { error } = await supabase.from('categories').upsert(itemsWithNewOrder.map(item => ({ id: item.id, restaurant_id: restaurant.id, name: item.name, parent_id: item.parent_id, sort_order: item.sort_order })));
      if (error) throw error;
    } catch (err: any) {
      alert("Error al guardar el nuevo orden.");
      fetchCategories();
    } finally {
      setActionLoading(false);
    }
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

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Modales */}
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

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configuración</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            Gestiona tu cuenta de <strong className="text-indigo-600">{restaurant?.name || 'Cargando...'}</strong>
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
           <button 
            onClick={() => setActiveTab('taxonomy')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'taxonomy' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
           >
            <FolderTree size={14} /> Estructura Menú
           </button>
           <button 
            onClick={() => setActiveTab('restaurant')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'restaurant' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
           >
            <Store size={14} /> Información Local
           </button>
           <button 
            onClick={() => setActiveTab('payments')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
           >
            <CreditCard size={14} /> Medios de Pago
           </button>
        </div>
      </div>

      {activeTab === 'taxonomy' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in slide-in-from-left-4">
          <div className="md:col-span-5 space-y-4">
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col min-h-[550px]">
              <div className="flex items-center space-x-2 mb-8">
                <LayoutGrid className="text-indigo-600" size={24} />
                <h2 className="text-lg font-black text-gray-900 tracking-tight uppercase tracking-widest text-sm">Categorías Principales</h2>
              </div>
              <div className="space-y-3 mb-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {parentCategories.map((cat) => (
                  <div
                    key={cat.id}
                    draggable
                    onDragStart={() => handleDragStart(cat.id)}
                    onDragOver={(e) => handleDragOver(e, cat.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, cat.id, false)}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border-2 cursor-pointer relative group ${selectedCategoryId === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-100'}`}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="cursor-grab active:cursor-grabbing text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"><GripVertical size={18} /></div>
                      <FolderTree size={18} className={selectedCategoryId === cat.id ? 'text-indigo-200' : 'text-gray-300'} />
                      {editingCategoryId === cat.id ? (
                        <div className="flex items-center gap-2 flex-1 mr-4" onClick={e => e.stopPropagation()}>
                          <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateCategoryName(cat.id)} className="w-full bg-white/20 border-none rounded-lg px-2 py-1 text-sm font-bold text-white outline-none" />
                          <button onClick={() => updateCategoryName(cat.id)} className="p-1 hover:bg-white/20 rounded-md"><Check size={14}/></button>
                        </div>
                      ) : <span className="font-bold text-sm tracking-tight">{cat.name}</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      {editingCategoryId !== cat.id && <button onClick={(e) => { e.stopPropagation(); setEditingCategoryId(cat.id); setEditingName(cat.name); }} className={`p-2 rounded-xl transition-all ${selectedCategoryId === cat.id ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 text-gray-400'}`}><Edit3 size={14} /></button>}
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, id: cat.id, name: cat.name, type: 'category' }); }} className={`p-2 rounded-xl transition-all ${selectedCategoryId === cat.id ? 'hover:bg-white/20 text-white' : 'hover:bg-rose-50 hover:text-rose-600 text-gray-400'}`}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-gray-50 flex space-x-2">
                <input type="text" placeholder="Nueva categoría..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} disabled={actionLoading} className="flex-1 bg-gray-50 border border-transparent rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" />
                <button onClick={addCategory} disabled={actionLoading || !newCategoryName.trim()} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50">{actionLoading ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}</button>
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
                <div className="flex flex-col space-y-3 mb-auto overflow-y-auto pr-2 custom-scrollbar">
                  {currentSubCategories.map((sub) => (
                    <div key={sub.id} draggable={editingCategoryId !== sub.id} onDragStart={() => handleDragStart(sub.id)} onDragOver={(e) => handleDragOver(e, sub.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, sub.id, true)} className={`flex items-center justify-between p-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] group hover:bg-white hover:border-gray-100 hover:shadow-sm transition-all ${editingCategoryId === sub.id ? 'bg-indigo-50 border-indigo-100' : ''}`}>
                      <div className="flex items-center space-x-4 flex-1 mr-4">
                        {editingCategoryId !== sub.id && <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-indigo-400 transition-colors"><GripVertical size={18} /></div>}
                        {editingCategoryId === sub.id ? <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateCategoryName(sub.id)} className="flex-1 bg-white border-2 border-indigo-200 rounded-xl px-4 py-2 text-sm font-bold text-indigo-900 outline-none" /> : <span className="font-bold text-gray-700 tracking-tight">{sub.name}</span>}
                      </div>
                      <div className="flex items-center space-x-2">
                        {editingCategoryId === sub.id ? <button onClick={() => updateCategoryName(sub.id)} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-md"><Check size={16}/></button> : <button onClick={() => { setEditingCategoryId(sub.id); setEditingName(sub.name); }} className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Edit3 size={18} /></button>}
                        <button onClick={() => setDeleteConfirm({ show: true, id: sub.id, name: sub.name, type: 'subcategory' })} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 pt-8 border-t border-gray-50 flex space-x-3">
                  <input type="text" placeholder="Ej: Pasta Larga..." value={newSubCategoryName} onChange={(e) => setNewSubCategoryName(e.target.value)} disabled={actionLoading} className="flex-1 bg-gray-50 border border-transparent rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <button onClick={addSubCategory} disabled={actionLoading || !newSubCategoryName.trim()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg flex items-center space-x-3 disabled:opacity-50">{actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}<span className="text-xs uppercase tracking-widest">Añadir</span></button>
                </div>
              </div>
            ) : <div className="bg-white rounded-[2.5rem] border border-gray-100 h-full flex flex-col items-center justify-center p-12 text-center shadow-sm"><Store size={40} className="text-gray-200 mb-6" /><h3 className="text-xl font-black text-gray-900 mb-2">Editor de Taxonomía</h3><p className="text-gray-400 text-sm">Selecciona una categoría principal para gestionar subcategorías.</p></div>}
          </div>
        </div>
      ) : activeTab === 'restaurant' ? (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-right-4">
           <div className="bg-gray-50 px-12 py-8 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Store size={20} className="text-indigo-600" />
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Ficha del Local</h2>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                Plan {restaurant?.plan}
              </span>
           </div>
           
           <form onSubmit={updateRestaurantInfo} className="p-12 space-y-10">
             <div className="flex flex-col md:flex-row gap-12 items-start">
               <div className="flex flex-col items-center gap-4">
                 <div 
                   onClick={() => logoInputRef.current?.click()}
                   className="w-44 h-44 rounded-[2.5rem] bg-gray-100 border-4 border-white shadow-xl overflow-hidden cursor-pointer group relative"
                 >
                   {previewUrl ? (
                     <img src={previewUrl} className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                       <UploadCloud size={32} />
                       <span className="text-[8px] font-black uppercase mt-2">Logo</span>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={28} />
                   </div>
                 </div>
                 <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoChange} />
                 <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Formatos: JPG, PNG (máx 2MB)</p>
               </div>

               <div className="flex-1 space-y-8 w-full">
                 <div className="grid grid-cols-1 gap-8">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nombre Comercial</label>
                     <div className="relative">
                        <Store size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          required 
                          value={restName} 
                          onChange={e => setRestName(e.target.value)}
                          placeholder="Nombre del restaurante"
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Dirección de Operación</label>
                     <div className="relative">
                        <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          required 
                          value={restAddress} 
                          onChange={e => setRestAddress(e.target.value)}
                          placeholder="Calle, Número, Ciudad"
                          className="w-full bg-gray-50 border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                     </div>
                   </div>
                 </div>
               </div>
             </div>

             {restMessage && (
               <div className={`p-6 rounded-[2rem] flex items-center gap-4 border-2 animate-in slide-in-from-bottom-2 ${
                 restMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
               }`}>
                 {restMessage.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                 <p className="font-bold">{restMessage.text}</p>
               </div>
             )}

             <div className="flex justify-end pt-6">
               <button 
                 type="submit" 
                 disabled={savingRest}
                 className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
               >
                 {savingRest ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                 {savingRest ? 'Actualizando...' : 'Guardar Información'}
               </button>
             </div>
           </form>
        </div>
      ) : (
        /* Pestaña de Pasarela de Pagos: Mercado Pago Manual Configuration */
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#009EE3] px-12 py-10 border-b border-white/10 flex items-center justify-between text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard size={24} />
                  <h2 className="text-2xl font-black tracking-tight">Medios de Pago</h2>
                </div>
                <p className="text-white/80 font-medium text-sm">Configura las credenciales de Mercado Pago para recibir cobros automáticos</p>
              </div>
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                 <Zap size={120} fill="white" />
              </div>
           </div>

           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-8">
                  <form onSubmit={handleSaveManualConfig} className="space-y-8 bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <ShieldCheck className="text-[#009EE3]" size={20} />
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Credenciales de Producción</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">MP User ID (Opcional)</label>
                        <div className="relative">
                           <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                           <input 
                             value={manualMpUserId} 
                             onChange={e => setManualMpUserId(e.target.value)}
                             placeholder="ID de usuario de Mercado Pago"
                             className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-[#009EE3] outline-none transition-all"
                           />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Public Key (Clave Pública) *</label>
                        <div className="relative">
                           <Key size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                           <input 
                             required 
                             value={manualPublicKey} 
                             onChange={e => setManualPublicKey(e.target.value)}
                             placeholder="APP_USR-..."
                             className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-[#009EE3] outline-none transition-all"
                           />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Access Token (Token de Acceso) *</label>
                        <div className="relative">
                           <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                           <input 
                             required 
                             type={showAccessToken ? "text" : "password"}
                             value={manualAccessToken} 
                             onChange={e => setManualAccessToken(e.target.value)}
                             placeholder="APP_USR-..."
                             className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-14 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-[#009EE3] outline-none transition-all"
                           />
                           <button 
                            type="button" 
                            onClick={() => setShowAccessToken(!showAccessToken)}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#009EE3]"
                           >
                            {showAccessToken ? <EyeOff size={18} /> : <Eye size={18} />}
                           </button>
                        </div>
                      </div>
                    </div>

                    {paymentMessage && (
                      <div className={`p-5 rounded-2xl flex items-center gap-3 border-2 animate-in slide-in-from-bottom-2 ${
                        paymentMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {paymentMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <p className="font-bold text-xs">{paymentMessage.text}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4">
                      {paymentConfig && (
                        <button 
                          type="button"
                          onClick={handleDisconnectMP}
                          className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Eliminar Credenciales
                        </button>
                      )}
                      <div className="flex-1"></div>
                      <button 
                        type="submit" 
                        disabled={savingPayment}
                        className="px-10 py-5 bg-[#009EE3] text-white rounded-2xl font-black shadow-2xl shadow-blue-100 hover:bg-[#0089C7] transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
                      >
                        {savingPayment ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {savingPayment ? 'Guardando...' : 'Guardar Cuenta MercadoPago'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="lg:col-span-5 space-y-8">
                  <div className="bg-indigo-50/30 border border-indigo-100 p-8 rounded-[2.5rem] space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#009EE3] shadow-sm">
                          <Zap size={20} fill="#009EE3" />
                       </div>
                       <h4 className="text-sm font-black text-gray-900 tracking-tight uppercase tracking-widest text-xs">Instrucciones</h4>
                    </div>
                    
                    <ol className="space-y-4">
                      {[
                        "Accede a tu cuenta de Mercado Pago Developers.",
                        "Ve a la sección 'Tus aplicaciones' y selecciona tu aplicación de producción.",
                        "En el menú lateral, busca 'Credenciales de producción'.",
                        "Copia tu 'Public Key', 'Access Token' e 'ID de usuario' y pégalos en el formulario.",
                        "Haz clic en 'Guardar Configuración' para activar los cobros."
                      ].map((step, i) => (
                        <li key={i} className="flex gap-4 items-start">
                          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-[#009EE3] shadow-sm shrink-0 mt-0.5">{i+1}</span>
                          <p className="text-sm text-gray-600 font-medium leading-snug">{step}</p>
                        </li>
                      ))}
                    </ol>

                    <div className="pt-4">
                      <a 
                        href="https://www.mercadopago.com.ar/developers/panel" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-4 bg-white border border-indigo-100 text-[#009EE3] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                      >
                         <ExternalLink size={14} /> Panel de Desarrolladores MP
                      </a>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center gap-4">
                     <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${paymentConfig ? 'bg-emerald-50 text-emerald-500' : 'bg-gray-50 text-gray-300'}`}>
                        <CheckCircle2 size={32} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Estado de Conexión</p>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          paymentConfig 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-gray-50 text-gray-500 border-gray-100'
                        }`}>
                           {paymentConfig ? 'Vinculado y Activo' : 'Sin Configurar'}
                        </span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Sección de Transferencia */}
              <div className="mt-12 pt-12 border-t border-gray-200">
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
                  <div className="bg-emerald-600 px-12 py-10 border-b border-white/10 flex items-center justify-between text-white relative overflow-hidden">
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <CreditCard size={24} />
                        <h2 className="text-2xl font-black tracking-tight">Transferencia</h2>
                      </div>
                      <p className="text-white/80 font-medium text-sm">Configura los datos bancarios para recibir transferencias</p>
                    </div>
                    <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                      <CreditCard size={120} fill="white" />
                    </div>
                  </div>

                  <div className="p-12">
                    <form onSubmit={handleSaveTransferConfig} className="space-y-8 bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100">
                      <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="text-emerald-600" size={20} />
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Datos Bancarios</h3>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Banco *</label>
                          <div className="relative">
                            <CreditCard size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                              required
                              value={transferBank}
                              onChange={e => setTransferBank(e.target.value)}
                              className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                            >
                              <option value="">Selecciona un banco</option>
                              {bankOptions.map((bank) => (
                                <option key={bank} value={bank}>
                                  {bank}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">CBU *</label>
                          <div className="relative">
                            <Key size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              required 
                              type="text"
                              inputMode="numeric"
                              value={transferCBU} 
                              onChange={handleCBUChange}
                              onPaste={handleCBUPaste}
                              placeholder="0000000000000000000000"
                              maxLength={22}
                              className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                          </div>
                          {transferCBU.length > 0 && transferCBU.length !== 22 && (
                            <p className="text-[9px] text-amber-600 font-medium ml-1">
                              El CBU debe tener exactamente 22 caracteres ({transferCBU.length}/22)
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nro de Cuenta *</label>
                          <div className="relative">
                            <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              required 
                              value={transferAccountNumber} 
                              onChange={e => setTransferAccountNumber(e.target.value)}
                              onPaste={e => handlePastePlainText(e, setTransferAccountNumber)}
                              placeholder="Número de cuenta bancaria"
                              className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Alias *</label>
                          <div className="relative">
                            <LinkIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              required 
                              value={transferAlias} 
                              onChange={e => setTransferAlias(e.target.value)}
                              onPaste={e => handlePastePlainText(e, setTransferAlias)}
                              placeholder="Alias bancario"
                              className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {transferMessage && (
                        <div className={`p-5 rounded-2xl flex items-center gap-3 border-2 animate-in slide-in-from-bottom-2 ${
                          transferMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          {transferMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                          <p className="font-bold text-xs">{transferMessage.text}</p>
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <button 
                          type="submit" 
                          disabled={savingTransfer}
                          className="px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-2xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
                        >
                          {savingTransfer ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          {savingTransfer ? 'Guardando...' : 'Guardar Cuenta Transferencia'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
