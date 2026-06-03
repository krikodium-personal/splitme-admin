
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Store, AlertCircle, Loader2, Camera, UploadCloud, 
  Save, MapPin, CheckCircle2, CreditCard, Link as LinkIcon, Zap,
  Key, ShieldCheck, ExternalLink, User, Trash2, Eye, EyeOff
} from 'lucide-react';
import { Restaurant, setGlobalRestaurant, PaymentConfig } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase';

interface SettingsPageProps {
  restaurant: Restaurant | null;
}

/** Caracteres visibles del access token guardado (prefijo APP_USR- / TEST- + inicio del id). */
const MP_TOKEN_PREFIX_VISIBLE = 28;

function mpTokenPrefixPreview(value: string | null | undefined): string {
  const v = value?.trim() || '';
  if (!v) return '';
  if (v.length <= MP_TOKEN_PREFIX_VISIBLE) return v;
  return `${v.slice(0, MP_TOKEN_PREFIX_VISIBLE)}…`;
}

type MpFormDraft = {
  userId: string;
  publicKey: string;
  accessToken: string;
  useSandbox: boolean;
};

function mpDraftStorageKey(restaurantId: string) {
  return `splitme_admin_mp_draft_${restaurantId}`;
}

function readMpDraft(restaurantId: string): MpFormDraft | null {
  try {
    const raw = sessionStorage.getItem(mpDraftStorageKey(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MpFormDraft>;
    return {
      userId: String(parsed.userId ?? ''),
      publicKey: String(parsed.publicKey ?? ''),
      accessToken: String(parsed.accessToken ?? ''),
      useSandbox: Boolean(parsed.useSandbox),
    };
  } catch {
    return null;
  }
}

function writeMpDraft(restaurantId: string, draft: MpFormDraft) {
  try {
    sessionStorage.setItem(mpDraftStorageKey(restaurantId), JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

function clearMpDraft(restaurantId: string) {
  try {
    sessionStorage.removeItem(mpDraftStorageKey(restaurantId));
  } catch {
    /* ignore */
  }
}

function mpDraftHasContent(draft: MpFormDraft): boolean {
  return Boolean(
    draft.userId.trim() || draft.publicKey.trim() || draft.accessToken.trim(),
  );
}

const SettingsPage: React.FC<SettingsPageProps> = ({ restaurant }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'restaurant' | 'payments' | 'taxonomy' | null;
  const [activeTab, setActiveTab] = useState<'restaurant' | 'payments'>(tabParam || 'restaurant');
  
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
  
  useEffect(() => {
    if (tabParam === 'taxonomy') {
      navigate('/menu-structure', { replace: true });
      return;
    }
    if (tabParam && ['restaurant', 'payments'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam, navigate]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados para Información del Restaurante
  const [restName, setRestName] = useState('');
  const [restAddress, setRestAddress] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savingRest, setSavingRest] = useState(false);
  const [restMessage, setRestMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Estados para Mercado Pago (Checkout Pro — app propia del restaurante)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [mpUserId, setMpUserId] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpUseTestCredentials, setMpUseTestCredentials] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [mpDraftRestored, setMpDraftRestored] = useState(false);
  const mpDraftReadyRef = useRef(false);

  const storedMpAccessToken =
    paymentConfig?.token_cbu?.trim() || paymentConfig?.token_cbu_test?.trim() || '';
  const hasStoredMpAccessToken = storedMpAccessToken.length > 0;

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

  useEffect(() => {
    if (isSupabaseConfigured) {
      if (restaurant) {
        setRestName(restaurant.name);
        setRestAddress(restaurant.address || '');
        setPreviewUrl(restaurant.logo_url || null);
        
        fetchPaymentConfig();
        setLoading(false);
      }
    } else {
      setLoading(false);
      setErrorMsg("Configura Supabase para gestionar el restaurante.");
    }
  }, [restaurant]);

  useEffect(() => {
    if (!restaurant?.id || !mpDraftReadyRef.current) return;
    const draft: MpFormDraft = {
      userId: mpUserId,
      publicKey: mpPublicKey,
      accessToken: mpAccessToken,
      useSandbox: mpUseTestCredentials,
    };
    if (mpDraftHasContent(draft) || draft.useSandbox) {
      writeMpDraft(restaurant.id, draft);
    } else {
      clearMpDraft(restaurant.id);
      setMpDraftRestored(false);
    }
  }, [restaurant?.id, mpUserId, mpPublicKey, mpAccessToken, mpUseTestCredentials]);

  const fetchPaymentConfig = async () => {
    if (!restaurant?.id) return;
    mpDraftReadyRef.current = false;
    try {
      // Cargar configuración de Mercado Pago
      const { data: mpData, error: mpError } = await supabase
        .from('payment_configs')
        .select('id, restaurant_id, key_alias, key_alias_test, token_cbu, token_cbu_test, oauth_test_mode, user_account, oauth_connected_at, token_expires_at, provider, is_active, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('provider', 'mercadopago')
        .maybeSingle();
      
      if (mpError) throw mpError;
      setPaymentConfig(mpData ?? null);
      if (mpData) {
        const useSandbox = mpData.oauth_test_mode === true;
        setMpUseTestCredentials(useSandbox);
        setMpUserId(mpData.user_account || '');
        setMpPublicKey(mpData.key_alias_test || mpData.key_alias || '');
        setMpAccessToken('');
      } else {
        setMpUserId('');
        setMpPublicKey('');
        setMpAccessToken('');
        setMpUseTestCredentials(false);
      }

      const draft = readMpDraft(restaurant.id);
      if (draft && mpDraftHasContent(draft)) {
        setMpUserId(draft.userId);
        setMpPublicKey(draft.publicKey);
        setMpAccessToken(draft.accessToken);
        setMpUseTestCredentials(draft.useSandbox);
        setMpDraftRestored(true);
      } else {
        setMpDraftRestored(false);
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
    } finally {
      mpDraftReadyRef.current = true;
    }
  };

  const handleSaveMpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?.id) return;

    const publicKey = mpPublicKey.trim();
    let accessToken = mpAccessToken.trim();
    const userId = mpUserId.trim();

    if (!publicKey) {
      setPaymentMessage({ type: 'error', text: 'Completá el Public Key de tu aplicación de Mercado Pago.' });
      return;
    }

    const preservingStoredToken = !mpAccessToken.trim();
    if (preservingStoredToken && paymentConfig) {
      accessToken = paymentConfig.token_cbu_test || paymentConfig.token_cbu || '';
    }
    if (!accessToken) {
      setPaymentMessage({ type: 'error', text: 'Completá el Access Token de tu aplicación de Mercado Pago.' });
      return;
    }

    const isTestPrefix = publicKey.startsWith('TEST-') && accessToken.startsWith('TEST-');
    const isAppUsr = publicKey.startsWith('APP_USR-') && accessToken.startsWith('APP_USR-');

    if (mpUseTestCredentials) {
      if (!isTestPrefix && !isAppUsr) {
        setPaymentMessage({
          type: 'error',
          text: 'En modo sandbox usá credenciales APP_USR de producción de tu app (lo habitual) o TEST- si tu app las muestra.',
        });
        return;
      }
    } else if (!isAppUsr) {
      setPaymentMessage({
        type: 'error',
        text: 'Sin modo sandbox, usá credenciales APP_USR de producción de tu app.',
      });
      return;
    }

    setSavingPayment(true);
    setPaymentMessage(null);

    try {
      const base = {
        restaurant_id: restaurant.id,
        provider: 'mercadopago',
        user_account: userId || null,
        oauth_connected_at: null,
        refresh_token: null,
        token_expires_at: null,
        is_active: true,
      };

      const payload: Record<string, unknown> = { ...base };

      if (mpUseTestCredentials) {
        payload.oauth_test_mode = true;
        if (isAppUsr) {
          payload.token_cbu = accessToken;
          payload.key_alias = publicKey;
        }
        if (isTestPrefix) {
          payload.token_cbu_test = accessToken;
          payload.key_alias_test = publicKey;
        }
        // Solo borrar el bucket opuesto si el usuario pegó credenciales nuevas
        // No borrar TEST- al pegar APP_USR (conviven: APP_USR crea preferencia, TEST- mejora sandbox).
        if (!preservingStoredToken && isTestPrefix) {
          payload.token_cbu = null;
          payload.key_alias = null;
        }
      } else {
        payload.oauth_test_mode = false;
        payload.token_cbu = accessToken;
        payload.key_alias = publicKey;
        payload.token_cbu_test = null;
        payload.key_alias_test = null;
      }

      if (paymentConfig?.id) {
        const { error } = await supabase
          .from('payment_configs')
          .update(payload)
          .eq('id', paymentConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_configs').insert(payload);
        if (error) throw error;
      }

      if (restaurant?.id) clearMpDraft(restaurant.id);
      setMpDraftRestored(false);
      await fetchPaymentConfig();
      setMpAccessToken('');
      setPaymentMessage({
        type: 'success',
        text: mpUseTestCredentials
          ? 'Modo prueba guardado. En checkout sandbox no uses «Como usuario» con cuenta real; invitado APRO o comprador test.'
          : 'Modo producción guardado. Solo cobros con tarjetas reales.',
      });
    } catch (err: any) {
      setPaymentMessage({
        type: 'error',
        text: err?.message || 'No se pudieron guardar las credenciales.',
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDisconnectMP = async () => {
    if (!restaurant?.id || !paymentConfig) return;
    if (!confirm("¿Eliminar las credenciales de Mercado Pago? Los cobros automáticos dejarán de funcionar.")) return;

    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from('payment_configs')
        .delete()
        .eq('id', paymentConfig.id);
      
      if (error) throw error;
      setPaymentConfig(null);
      setMpUserId('');
      setMpPublicKey('');
      setMpAccessToken('');
      setMpUseTestCredentials(false);
      if (restaurant?.id) clearMpDraft(restaurant.id);
      setMpDraftRestored(false);
      setPaymentMessage({ type: 'success', text: 'Credenciales de Mercado Pago eliminadas.' });
    } catch (err: any) {
      alert("Error al desvincular: " + (err.message || "Error desconocido"));
    } finally {
      setSavingPayment(false);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configuración</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            Gestiona tu cuenta de <strong className="text-indigo-600">{restaurant?.name || 'Cargando...'}</strong>
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
           <button 
            onClick={() => { setActiveTab('restaurant'); updateURL({ tab: 'restaurant' }); }}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'restaurant' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
           >
            <Store size={14} /> Información Local
           </button>
           <button 
            onClick={() => { setActiveTab('payments'); updateURL({ tab: 'payments' }); }}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'payments' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
           >
            <CreditCard size={14} /> Medios de Pago
           </button>
        </div>
      </div>

      {activeTab === 'restaurant' ? (
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
        /* Pestaña de Pasarela de Pagos: Checkout Pro */
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#009EE3] px-12 py-10 border-b border-white/10 flex items-center justify-between text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard size={24} />
                  <h2 className="text-2xl font-black tracking-tight">Medios de Pago</h2>
                </div>
                <p className="text-white/80 font-medium text-sm">
                  Checkout Pro con la aplicación de Mercado Pago de este local. El cobro va 100% al restaurante; SplitMe no retiene el dinero.
                </p>
              </div>
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                 <Zap size={120} fill="white" />
              </div>
           </div>

           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-8">
                  <form onSubmit={handleSaveMpConfig} className="space-y-6 bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="text-[#009EE3]" size={20} />
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Checkout Pro — tu aplicación MP</h3>
                    </div>

                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      Creá una aplicación en Mercado Pago con la cuenta de este local y pegá acá el Public Key y el Access Token.
                    </p>

                    {mpDraftRestored && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 font-semibold leading-relaxed">
                        Borrador restaurado: podés salir a buscar credenciales en MP y volver sin perder lo que cargaste. Guardá cuando termines.
                      </p>
                    )}

                    <label className="flex items-center gap-3 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mpUseTestCredentials}
                        onChange={(e) => setMpUseTestCredentials(e.target.checked)}
                        className="rounded border-gray-300 text-[#009EE3] focus:ring-[#009EE3]"
                      />
                      Modo sandbox — probar con tarjetas de prueba
                    </label>

                    {mpUseTestCredentials ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 leading-relaxed space-y-2">
                        <p>
                          <strong>Modo prueba activo.</strong> Si el vendedor es cuenta test de MP (User ID tipo 3429822713), el checkout abre en{" "}
                          <strong>sandbox.mercadopago.com.ar</strong>. Conectá OAuth con «Modo sandbox» para guardar token <strong>TEST-</strong>, o pegá APP_USR del vendedor test.
                          Pagá en incógnito, sin sesión real, tarjeta de prueba (titular APRO).
                        </p>
                        <p>
                          Tarjeta: 5031 7557 3453 0604 · titular <strong>APRO</strong> · DNI 12345678 · CVV 123.
                          Pagá como <strong>invitado</strong> (sin tu cuenta real de MP). Si ves «Como usuario» en el checkout, cerrá sesión en Mercado Pago o usá incógnito.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-xs text-blue-900 leading-relaxed">
                        <strong>Modo producción.</strong> Solo tarjetas reales. Para pruebas, activá «Modo sandbox» arriba.
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">MP User ID (opcional)</label>
                      <div className="relative">
                        <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={mpUserId}
                          onChange={(e) => setMpUserId(e.target.value.replace(/\D/g, ''))}
                          placeholder="Ej: 3110331459"
                          className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-[#009EE3] outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Public Key *</label>
                      <div className="relative">
                        <Key size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          required
                          value={mpPublicKey}
                          onChange={(e) => setMpPublicKey(e.target.value)}
                          placeholder="APP_USR-... (producción de tu app)"
                          className="w-full bg-white border-2 border-transparent rounded-2xl py-5 pl-14 pr-5 font-bold text-gray-900 shadow-sm focus:ring-2 focus:ring-[#009EE3] outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Access Token *</label>
                      {hasStoredMpAccessToken && !mpAccessToken && (
                        <div
                          className="flex items-stretch rounded-2xl border-2 border-emerald-100 bg-emerald-50/60 overflow-hidden"
                          aria-label="Access token guardado"
                        >
                          <span className="font-mono text-sm font-bold text-emerald-900 px-4 py-3.5 shrink-0 border-r border-emerald-100/80">
                            {mpTokenPrefixPreview(storedMpAccessToken)}
                          </span>
                          <span className="font-mono text-sm text-emerald-700/50 tracking-[0.2em] px-4 py-3.5 select-none">
                            ••••••••••••••••
                          </span>
                        </div>
                      )}
                      <div className="relative">
                        <ShieldCheck size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          required={!hasStoredMpAccessToken}
                          type={showAccessToken ? 'text' : 'password'}
                          value={mpAccessToken}
                          onChange={(e) => setMpAccessToken(e.target.value)}
                          placeholder={
                            hasStoredMpAccessToken
                              ? 'Opcional: pegá un token nuevo para reemplazarlo'
                              : 'APP_USR-... (producción de tu app)'
                          }
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
                      {hasStoredMpAccessToken && !mpAccessToken && (
                        <p className="text-[11px] text-emerald-700 ml-1 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          Token guardado. Dejá el campo de abajo vacío para conservarlo o pegá uno nuevo para reemplazarlo.
                        </p>
                      )}
                      {paymentConfig && !hasStoredMpAccessToken && (
                        <p className="text-[11px] text-amber-700 ml-1">
                          No hay access token guardado. Pegalo y hacé clic en «Guardar credenciales».
                        </p>
                      )}
                    </div>

                    {paymentMessage && (
                      <div className={`p-5 rounded-2xl flex items-center gap-3 border-2 ${
                        paymentMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {paymentMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <p className="font-bold text-xs">{paymentMessage.text}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                      {paymentConfig && (
                        <button
                          type="button"
                          onClick={handleDisconnectMP}
                          disabled={savingPayment}
                          className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Eliminar credenciales
                        </button>
                      )}
                      <div className="flex-1" />
                      <button
                        type="submit"
                        disabled={savingPayment}
                        className="px-10 py-5 bg-[#009EE3] text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-[#0089C7] transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
                      >
                        {savingPayment ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {savingPayment ? 'Guardando...' : paymentConfig ? 'Actualizar credenciales' : 'Guardar credenciales'}
                      </button>
                    </div>
                  </form>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex flex-col items-center text-center gap-4">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${
                      paymentConfig?.token_cbu || paymentConfig?.token_cbu_test
                        ? 'bg-emerald-50 text-emerald-500'
                        : 'bg-gray-50 text-gray-300'
                    }`}>
                      <CheckCircle2 size={32} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Estado de conexión</p>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        paymentConfig?.token_cbu || paymentConfig?.token_cbu_test
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}>
                        {paymentConfig?.token_cbu || paymentConfig?.token_cbu_test ? 'Vinculado y activo' : 'Sin configurar'}
                      </span>
                    </div>
                  </div>
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
                        "Entrá a mercadopago.com.ar con la cuenta real del restaurante (no con usuario TESTUSER).",
                        "En Developers → Crear aplicación: Pagos online, Con un desarrollo propio.",
                        "Paso 3: elegí Checkout Pro (no Bricks ni API).",
                        "En Credenciales de producción copiá Public Key y Access Token (APP_USR) y pegalos en el formulario.",
                        "Para probar: activá «Modo sandbox», cargá APP_USR de tu app y pagá con tarjeta de prueba en sandbox.mercadopago.com.ar.",
                        "SplitMe no retiene el dinero; el fee de plataforma se cobra aparte (mensual)."
                      ].map((step, i) => (
                        <li key={i} className="flex gap-4 items-start">
                          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-[#009EE3] shadow-sm shrink-0 mt-0.5">{i+1}</span>
                          <p className="text-sm text-gray-600 font-medium leading-snug">{step}</p>
                        </li>
                      ))}
                    </ol>

                    <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-2 text-[11px] text-gray-600">
                      <p className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Sandbox — tarjetas de prueba</p>
                      <p>Mastercard aprobada: <code className="font-mono text-[10px]">5031 7557 3453 0604</code> · CVV <code className="font-mono">123</code> · vencimiento futuro · DNI <code className="font-mono">12345678</code></p>
                      <p>Pagá con el usuario comprador de prueba o como invitado con esa tarjeta.</p>
                      <a
                        href="https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/add-integration-test/test-cards"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#009EE3] font-bold hover:underline"
                      >
                        <ExternalLink size={12} /> Ver tarjetas de prueba en MP
                      </a>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-[11px] text-gray-600 leading-relaxed">
                      <p className="font-bold text-gray-800 mb-1">Configuración de SplitMe (plataforma)</p>
                      <p>Webhook, secret y app de integración los gestiona el equipo SplitMe. No hace falta configurarlos acá.</p>
                    </div>

                    <div className="pt-2">
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
