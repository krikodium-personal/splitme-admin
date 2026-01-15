
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, PlusCircle, List, Settings, LogOut, ShoppingBag, 
  Store, Users, Grid, AlertTriangle, Loader2, Globe, ShieldCheck, RefreshCw,
  MessageSquareQuote, BarChart3, Bell, X, CheckCircle2, DollarSign
} from 'lucide-react';
import CreateItemPage from './pages/CreateItemPage';
import MenuListPage from './pages/MenuListPage';
import SettingsPage from './pages/SettingsPage';
import OrdersPage from './pages/OrdersPage';
import WaitersPage from './pages/WaitersPage';
import TablesPage from './pages/TablesPage';
import LoginPage from './pages/LoginPage';
import SuperAdminPage from './pages/SuperAdminPage';
import RestaurantDetailsPage from './pages/RestaurantDetailsPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';
import { Restaurant, Profile, setGlobalRestaurant } from './types';
import { isSupabaseConfigured, supabase } from './supabase';

interface PaymentToast {
  id: string;
  amount: number;
  dinerName?: string;
}

// Contexto para compartir el estado de nuevos batches
interface NewBatchesContextType {
  newBatchesByOrder: Set<string>;
  clearNewBatches: () => void;
  clearNewBatchForOrder: (orderId: string) => void;
}

const NewBatchesContext = createContext<NewBatchesContextType>({
  newBatchesByOrder: new Set(),
  clearNewBatches: () => {},
  clearNewBatchForOrder: () => {}
});

const SidebarLink = ({ to, icon: Icon, label, badgeCount, onNavigate }: { to: string, icon: any, label: string, badgeCount?: number, onNavigate?: () => void }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const hasBadge = badgeCount !== undefined && badgeCount > 0;
  
  return (
    <Link 
      to={to} 
      onClick={() => {
        if (onNavigate) {
          onNavigate();
        }
      }}
      className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all relative ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
    >
      <Icon size={20} />
      <span className="font-medium text-sm">{label}</span>
      {hasBadge && (
        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
      )}
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode, profile: Profile | null, restaurant: Restaurant | null }> = ({ children, profile, restaurant }) => {
  const location = useLocation();
  const [toasts, setToasts] = useState<PaymentToast[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const paymentMethodAudioRef = useRef<HTMLAudioElement | null>(null);
  const [newBatchesCount, setNewBatchesCount] = useState(0);
  const [newBatchesByOrder, setNewBatchesByOrder] = useState<Set<string>>(new Set());
  const notifiedBatchesRef = useRef<Set<string>>(new Set()); // Para evitar notificar el mismo batch dos veces
  
  // Limpiar notificaciones cuando se está en la página de Pedidos
  useEffect(() => {
    if (location.pathname === '/orders') {
      console.log('🧹 Limpiando notificaciones (estamos en /orders)');
      setNewBatchesCount(0);
      setNewBatchesByOrder(new Set());
    }
  }, [location.pathname]);

  useEffect(() => {
    // Cargar sonidos desde Supabase Storage o usar URLs por defecto
    const loadSounds = async () => {
      try {
        // Intentar cargar sonido de cambio de método de pago desde Storage
        const { data: paymentMethodSoundUrl } = supabase.storage
          .from('sounds')
          .getPublicUrl('mixkit-software-interface-back-2575.wav');
        
        if (paymentMethodSoundUrl?.publicUrl) {
          paymentMethodAudioRef.current = new Audio(paymentMethodSoundUrl.publicUrl);
        } else {
          // Fallback a URL por defecto si no existe en Storage
          paymentMethodAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2703/2703-preview.mp3');
        }
      } catch (error) {
        console.warn('No se pudo cargar sonido desde Storage, usando URL por defecto:', error);
        paymentMethodAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2703/2703-preview.mp3');
      }
      
      // Sonido de pagos recibidos (puedes también subirlo a Storage)
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    };
    
    loadSounds();
    
    if (restaurant?.id) {
      console.log('🎧 Configurando listeners para restaurante:', restaurant.id);
      // Canal para pagos y métodos de pago
      const paymentChannel = supabase
        .channel(`admin-payment-alerts-${restaurant.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `restaurant_id=eq.${restaurant.id}`
        }, (payload) => {
          const newPayment = payload.new;
          
          // Alerta Sonora
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }

          // Alerta Visual (Toast)
          const toastId = Math.random().toString(36).substring(7);
          const newToast: PaymentToast = {
            id: toastId,
            amount: newPayment.amount,
            dinerName: newPayment.payer_name || 'Un comensal'
          };

          setToasts(prev => [...prev, newToast]);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 8000);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_guests'
        }, (payload) => {
          // Verificar si cambió el payment_method
          const oldPaymentMethod = payload.old?.payment_method;
          const newPaymentMethod = payload.new?.payment_method;
          
          // Si el payment_method cambió y ahora tiene un valor (no es null)
          if (oldPaymentMethod !== newPaymentMethod && newPaymentMethod) {
            // Reproducir sonido de notificación de cambio de método de pago
            if (paymentMethodAudioRef.current) {
              paymentMethodAudioRef.current.currentTime = 0;
              paymentMethodAudioRef.current.play().catch(() => {});
            }
          }
        });
      
      // Suscribir el canal de pagos
      paymentChannel.subscribe((status) => {
        console.log('📡 Estado del canal de pagos:', status);
      });
      
      // Canal separado para batches
      const batchChannel = supabase
        .channel(`admin-batch-notifications-${restaurant.id}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'order_batches'
        }, async (payload) => {
          const newBatch = payload.new;
          const batchId = newBatch.id;
          
          console.log('🔔 Nuevo batch INSERT detectado:', batchId, 'status:', newBatch.status);
          
          // Solo notificar batches que no sean CREADO
          if (newBatch.status === 'CREADO') {
            console.log('⏭️ Batch ignorado (status CREADO)');
            return;
          }
          
          // Verificar si ya notificamos este batch
          if (notifiedBatchesRef.current.has(batchId)) {
            console.log('⏭️ Batch ya notificado anteriormente');
            return;
          }
          
          // Obtener la orden para verificar que pertenece al restaurante
          if (newBatch.order_id) {
            const { data: order, error } = await supabase
              .from('orders')
              .select('restaurant_id')
              .eq('id', newBatch.order_id)
              .single();
            
            console.log('📋 Orden encontrada:', order?.id, 'restaurant_id:', order?.restaurant_id, 'Error:', error);
            
            // Solo notificar si la orden pertenece al restaurante actual
            if (order && order.restaurant_id === restaurant.id) {
              // Marcar batch como notificado
              notifiedBatchesRef.current.add(batchId);
              
              console.log('✅ Notificando nuevo batch para orden:', newBatch.order_id);
              // Incrementar contador de nuevos batches
              setNewBatchesCount(prev => {
                const newCount = prev + 1;
                console.log('🔴 Contador de batches:', newCount);
                return newCount;
              });
              
              // Agregar order_id al set de órdenes con nuevos batches
              setNewBatchesByOrder(prev => {
                const newSet = new Set(prev);
                newSet.add(newBatch.order_id);
                console.log('📝 Órdenes con nuevos batches:', Array.from(newSet));
                return newSet;
              });
              
              // Reproducir sonido de notificación
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch((err) => console.error('Error reproduciendo sonido:', err));
              }
            } else {
              console.log('❌ Orden no pertenece al restaurante actual. Esperado:', restaurant.id, 'Encontrado:', order?.restaurant_id);
            }
          } else {
            console.log('⚠️ Batch no tiene order_id');
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_batches'
        }, async (payload) => {
          const updatedBatch = payload.new;
          const batchId = updatedBatch.id;
          
          console.log('🔄 Batch UPDATE detectado:', batchId, 'status:', updatedBatch.status);
          
          // Notificar si el batch tiene un status diferente a CREADO
          // Esto captura cuando un batch cambia de CREADO a ENVIADO, PREPARANDO, etc.
          if (updatedBatch.status && updatedBatch.status !== 'CREADO') {
            // Verificar si ya notificamos este batch antes (evitar duplicados)
            if (notifiedBatchesRef.current.has(batchId)) {
              console.log('⏭️ Batch ya notificado anteriormente (UPDATE)');
              return;
            }
            
            console.log('✅ Batch tiene status', updatedBatch.status, '- Verificando orden...');
            
            // Obtener la orden para verificar que pertenece al restaurante
            if (updatedBatch.order_id) {
              const { data: order, error } = await supabase
                .from('orders')
                .select('restaurant_id')
                .eq('id', updatedBatch.order_id)
                .single();
              
              console.log('📋 Orden encontrada (UPDATE):', order?.id, 'restaurant_id:', order?.restaurant_id, 'Error:', error);
              
              // Solo notificar si la orden pertenece al restaurante actual
              if (order && order.restaurant_id === restaurant.id) {
                // Marcar batch como notificado
                notifiedBatchesRef.current.add(batchId);
                
                console.log('✅ Notificando batch actualizado para orden:', updatedBatch.order_id);
                // Incrementar contador de nuevos batches
                setNewBatchesCount(prev => {
                  const newCount = prev + 1;
                  console.log('🔴 Contador de batches (UPDATE):', newCount);
                  return newCount;
                });
                
                // Agregar order_id al set de órdenes con nuevos batches
                setNewBatchesByOrder(prev => {
                  const newSet = new Set(prev);
                  newSet.add(updatedBatch.order_id);
                  console.log('📝 Órdenes con nuevos batches (UPDATE):', Array.from(newSet));
                  return newSet;
                });
                
                // Reproducir sonido de notificación
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  audioRef.current.play().catch((err) => console.error('Error reproduciendo sonido:', err));
                }
              } else {
                console.log('❌ Orden no pertenece al restaurante actual (UPDATE). Esperado:', restaurant.id, 'Encontrado:', order?.restaurant_id);
              }
            } else {
              console.log('⚠️ Batch UPDATE no tiene order_id');
            }
          } else {
            console.log('⏭️ Batch UPDATE ignorado - status es CREADO o no tiene status');
          }
        })
        .subscribe((status) => {
          console.log('📡 Estado del canal de batches:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Canal de batches suscrito correctamente');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error en el canal de batches');
          }
        });

      return () => {
        console.log('🔌 Desconectando canales');
        supabase.removeChannel(batchChannel);
        supabase.removeChannel(paymentChannel);
      };
    } else {
      console.log('⚠️ No hay restaurante configurado, no se configuran listeners');
    }
  }, [restaurant?.id]); // Solo ejecutar cuando cambia el ID del restaurante, no el objeto completo

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearNewBatches = () => {
    setNewBatchesCount(0);
    setNewBatchesByOrder(new Set());
    notifiedBatchesRef.current.clear(); // Limpiar también el ref de batches notificados
  };

  const clearNewBatchForOrder = (orderId: string) => {
    setNewBatchesByOrder(prev => {
      const newSet = new Set(prev);
      newSet.delete(orderId);
      return newSet;
    });
    setNewBatchesCount(prev => Math.max(0, prev - 1));
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 relative">
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id}
            className="pointer-events-auto bg-white border-2 border-emerald-100 shadow-2xl rounded-[1.8rem] p-5 flex items-center gap-4 min-w-[340px] animate-in slide-in-from-right-8 duration-500"
          >
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 shrink-0">
              <DollarSign size={28} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">¡Pago Recibido!</p>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {toast.dinerName} ha pagado <span className="text-emerald-600 font-black text-base">${Number(toast.amount).toLocaleString('es-CL')}</span>
              </p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-300 hover:text-gray-900 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col p-6">
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
            <span className="text-xl font-bold text-gray-800 tracking-tight">Splitme</span>
          </div>
          <nav className="space-y-2 flex-1">
            {profile?.role === 'super_admin' ? (
              <SidebarLink to="/super-admin" icon={Globe} label="Vista Global" />
            ) : (
              <>
                <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" />
                <SidebarLink 
                  to="/orders" 
                  icon={ShoppingBag} 
                  label="Pedidos" 
                  badgeCount={newBatchesCount > 0 ? newBatchesCount : undefined} 
                  onNavigate={() => {
                    // Limpiar notificaciones cuando se navega a Pedidos
                    if (location.pathname !== '/orders') {
                      console.log('🧹 Limpiando notificaciones al navegar a Pedidos');
                      clearNewBatches();
                    }
                  }}
                />
                <SidebarLink to="/menu" icon={List} label="Productos" />
                <SidebarLink to="/tables" icon={Grid} label="Mesas" />
                <SidebarLink to="/waiters" icon={Users} label="Meseros" />
                <SidebarLink to="/feedback" icon={BarChart3} label="Calidad" />
                <SidebarLink to="/create" icon={PlusCircle} label="Añadir" />
                <SidebarLink to="/settings" icon={Settings} label="Configuración" />
              </>
            )}
          </nav>
          <button onClick={handleLogout} className="flex items-center space-x-3 text-gray-400 hover:text-red-500 transition-colors p-4 mt-auto">
            <LogOut size={20} />
            <span className="font-medium text-sm">Salir</span>
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-gray-100 px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {restaurant && <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">{restaurant.name}</span>}
              {!restaurant && profile?.role === 'super_admin' && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">Panel Central</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-bold text-gray-800">{profile?.full_name}</p>
                <p className="text-[10px] text-gray-400 uppercase font-black">{profile?.role}</p>
              </div>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} className="w-8 h-8 rounded-full border-2 border-indigo-100" />
            </div>
          </header>
          <NewBatchesContext.Provider value={{ newBatchesByOrder, clearNewBatches, clearNewBatchForOrder }}>
            <div className="p-8">{children}</div>
          </NewBatchesContext.Provider>
        </main>
      </div>
    </div>
  );
};

// Hook para usar el contexto de nuevos batches
export const useNewBatches = () => useContext(NewBatchesContext);

const App: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRestaurant(null);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) loadUserData(session.user.id);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await loadUserData(session.user.id);
      else setLoading(false);
    } catch (e) { setLoading(false); }
  };

  const loadUserData = async (userId: string) => {
    try {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (p) {
        setProfile(p);
        if (p.restaurant_id) {
          const { data: r } = await supabase.from('restaurants').select('*').eq('id', p.restaurant_id).maybeSingle();
          if (r) { setRestaurant(r); setGlobalRestaurant(r); }
        }
      }
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-indigo-600 animate-spin" size={48} />
          <p className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px]">Cargando Sistema</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!profile ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/*" element={
          profile ? (
            <Layout profile={profile} restaurant={restaurant}>
              <Routes>
                {profile.role === 'super_admin' ? (
                  <>
                    <Route path="/super-admin" element={<SuperAdminPage />} />
                    <Route path="/super-admin/restaurant/:id" element={<RestaurantDetailsPage />} />
                    <Route path="*" element={<Navigate to="/super-admin" />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/create" element={<CreateItemPage />} />
                    <Route path="/edit/:id" element={<CreateItemPage />} />
                    <Route path="/menu" element={<MenuListPage />} />
                    <Route path="/tables" element={<TablesPage />} />
                    <Route path="/waiters" element={<WaitersPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/settings" element={<SettingsPage restaurant={restaurant} />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </>
                )}
              </Routes>
            </Layout>
          ) : <Navigate to="/login" />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
