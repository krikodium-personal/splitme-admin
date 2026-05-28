
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Store, AlertCircle, Loader2, Camera, UploadCloud, 
  Save, MapPin, CheckCircle2, CreditCard, Link as LinkIcon, RefreshCw, Zap,
  Key, ShieldCheck, ExternalLink, User, Trash2
} from 'lucide-react';
import { Restaurant, setGlobalRestaurant, PaymentConfig } from '../types';
import { supabase, isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';

interface SettingsPageProps {
  restaurant: Restaurant | null;
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

  useEffect(() => {
    const mpConnected = searchParams.get('mp_connected');
    const mpError = searchParams.get('mp_error');
    const mpUserId = searchParams.get('mp_user_id');

    if (mpConnected === '1') {
      setPaymentMessage({
        type: 'success',
        text: mpUserId
          ? `Mercado Pago conectado correctamente (User ID ${mpUserId}).`
          : 'Mercado Pago conectado correctamente.',
      });
      fetchPaymentConfig();
      updateURL({ mp_connected: null, mp_user_id: null, mp_error: null });
    } else if (mpError) {
      setPaymentMessage({
        type: 'error',
        text: `No se pudo conectar Mercado Pago: ${decodeURIComponent(mpError)}`,
      });
      updateURL({ mp_error: null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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

  // Estados para Mercado Pago
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [connectingMp, setConnectingMp] = useState(false);
  const [mpTestMode, setMpTestMode] = useState(true);
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

  const fetchPaymentConfig = async () => {
    if (!restaurant?.id) return;
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
        const inferredTestMode = mpData.oauth_test_mode ?? mpData.key_alias?.startsWith('TEST-') ?? false;
        setMpTestMode(inferredTestMode);
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

  const handleConnectMercadoPago = async () => {
    if (!restaurant?.id) return;

    setConnectingMp(true);
    setPaymentMessage(null);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setPaymentMessage({ type: 'error', text: 'Sesión expirada. Volvé a iniciar sesión.' });
        return;
      }

      const returnUrl = `${window.location.origin}/settings?tab=payments`;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/mercadopago-oauth-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          return_url: returnUrl,
          test_mode: mpTestMode,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setPaymentMessage({
          type: 'error',
          text: data?.error || `Error al iniciar OAuth (${res.status})`,
        });
        return;
      }

      if (!data.authorization_url) {
        setPaymentMessage({ type: 'error', text: 'No se recibió URL de autorización de Mercado Pago.' });
        return;
      }

      window.location.href = data.authorization_url;
    } catch (err: any) {
      setPaymentMessage({ type: 'error', text: err?.message || 'Error al conectar Mercado Pago.' });
    } finally {
      setConnectingMp(false);
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
      setPaymentMessage({ type: 'success', text: 'Cuenta de Mercado Pago desconectada.' });
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
        /* Pestaña de Pasarela de Pagos: Mercado Pago OAuth */
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-[#009EE3] px-12 py-10 border-b border-white/10 flex items-center justify-between text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard size={24} />
                  <h2 className="text-2xl font-black tracking-tight">Medios de Pago</h2>
                </div>
                <p className="text-white/80 font-medium text-sm">Conectá la cuenta Mercado Pago de este local. El cobro va directo al restaurante; SplitMe no es el cobrador.</p>
              </div>
              <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                 <Zap size={120} fill="white" />
              </div>
           </div>

           <div className="p-12 space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-8">
                  <div className="space-y-6 bg-gray-50/50 p-10 rounded-[2.5rem] border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      <LinkIcon className="text-[#009EE3]" size={20} />
                      <h3 className="text-lg font-black text-gray-900 tracking-tight">Conectar con Mercado Pago</h3>
                    </div>

                    <p className="text-sm text-gray-600 font-medium leading-relaxed">
                      El restaurante inicia sesión en Mercado Pago y autoriza a SplitMe para crear checkouts en su cuenta.
                      No hace falta crear una aplicación propia ni copiar tokens a mano.
                    </p>

                    {paymentConfig?.oauth_connected_at ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
                        <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                          <CheckCircle2 size={18} />
                          Cuenta conectada
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            paymentConfig.oauth_test_mode
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}>
                            {paymentConfig.oauth_test_mode ? 'Sandbox' : 'Producción'}
                          </span>
                        </div>
                        {paymentConfig.user_account && (
                          <p className="text-xs text-emerald-800 font-medium">
                            MP User ID: <span className="font-mono">{paymentConfig.user_account}</span>
                          </p>
                        )}
                        {paymentConfig.key_alias_test && (
                          <p className="text-xs text-emerald-800 font-medium truncate">
                            Public Key TEST: <span className="font-mono">{paymentConfig.key_alias_test}</span>
                          </p>
                        )}
                        {paymentConfig.key_alias && (
                          <p className="text-xs text-emerald-800 font-medium truncate">
                            Public Key APP_USR: <span className="font-mono">{paymentConfig.key_alias}</span>
                          </p>
                        )}
                        {paymentConfig.token_cbu_test && (
                          <p className="text-xs text-emerald-800 font-medium">
                            Token TEST: <span className="font-mono">{paymentConfig.token_cbu_test.substring(0, 12)}...</span>
                          </p>
                        )}
                        {paymentConfig.token_cbu && (
                          <p className="text-xs text-emerald-800 font-medium">
                            Token APP_USR: <span className="font-mono">{paymentConfig.token_cbu.substring(0, 12)}...</span>
                          </p>
                        )}
                        <p className="text-[11px] text-emerald-700">
                          Conectado el {new Date(paymentConfig.oauth_connected_at).toLocaleString('es-AR')}
                        </p>
                      </div>
                    ) : paymentConfig && !paymentConfig.oauth_connected_at ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                        Hay una configuración anterior. Reconectá con Mercado Pago para actualizar las credenciales.
                      </div>
                    ) : null}

                    <label className="flex items-center gap-3 text-xs font-bold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mpTestMode}
                        onChange={(e) => setMpTestMode(e.target.checked)}
                        className="rounded border-gray-300 text-[#009EE3] focus:ring-[#009EE3]"
                      />
                      Modo sandbox (credenciales TEST + checkout sandbox de Mercado Pago)
                    </label>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={handleConnectMercadoPago}
                        disabled={connectingMp || savingPayment}
                        className="px-8 py-4 bg-[#009EE3] text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-[#0089C7] transition-all flex items-center gap-3 disabled:opacity-50 uppercase tracking-widest text-xs active:scale-95"
                      >
                        {connectingMp ? <Loader2 size={18} className="animate-spin" /> : <LinkIcon size={18} />}
                        {connectingMp ? 'Redirigiendo...' : paymentConfig?.oauth_connected_at ? 'Reconectar Mercado Pago' : 'Conectar Mercado Pago'}
                      </button>

                      {paymentConfig && (
                        <button
                          type="button"
                          onClick={handleDisconnectMP}
                          disabled={connectingMp || savingPayment}
                          className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Desconectar
                        </button>
                      )}
                    </div>

                    {paymentMessage && (
                      <div className={`p-5 rounded-2xl flex items-center gap-3 border-2 animate-in slide-in-from-bottom-2 ${
                        paymentMessage.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                      }`}>
                        {paymentMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        <p className="font-bold text-xs">{paymentMessage.text}</p>
                      </div>
                    )}
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
                        "Hacé clic en Conectar Mercado Pago. Se abre el login de MP del vendedor de este local.",
                        "El vendedor autoriza la aplicación SplitMe. No necesita crear su propia app en Developers.",
                        "SplitMe guarda el access token y public key de esa cuenta automáticamente.",
                        "Para probar, dejá activado Modo sandbox e iniciá sesión con el usuario vendedor de prueba (Resto1, Resto2, etc.).",
                        "El cobro va directo a la cuenta del restaurante. SplitMe no retiene el dinero."
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
