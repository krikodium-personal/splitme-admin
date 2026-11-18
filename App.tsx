
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, PlusCircle, List, Settings, LogOut, ShoppingBag,
  Store, Users, Grid, AlertTriangle, Loader2, Globe, ShieldCheck, RefreshCw,
  MessageSquareQuote, BarChart3, Bell, X, CheckCircle2, DollarSign, Menu, FolderTree, Image, BrainCircuit, Percent
} from 'lucide-react';
import CreateItemPage from './pages/CreateItemPage';
import MenuListPage from './pages/MenuListPage';
import SettingsPage from './pages/SettingsPage';
import MenuStructurePage from './pages/MenuStructurePage';
import OrdersPage from './pages/OrdersPage';
import WaitersPage from './pages/WaitersPage';
import TablesPage from './pages/TablesPage';
import LoginPage from './pages/LoginPage';
import SuperAdminPage from './pages/SuperAdminPage';
import RestaurantDetailsPage from './pages/RestaurantDetailsPage';
import RestaurantUsersPage from './pages/RestaurantUsersPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';
import BannersPage from './pages/BannersPage';
import PromotionsPage from './pages/PromotionsPage';
import AiAnalysisPage from './pages/AiAnalysisPage';
import { Restaurant, Profile, setGlobalRestaurant, CURRENT_RESTAURANT } from './types';
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

const SidebarLink = ({ to, icon: Icon, label, badgeCount, onNavigate, onMobileClick }: { to: string, icon: any, label: string, badgeCount?: number, onNavigate?: () => void, onMobileClick?: () => void }) => {
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
        if (onMobileClick) {
          onMobileClick();
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

// Restaurante que el super admin está administrando: se recuerda en la sesión del navegador para que las
// pantallas del restaurante (/orders, /menu, ...) sigan sabiendo cuál es al navegar o recargar.
const MANAGED_KEY = 'splitme_managed_restaurant';
const readManagedId = (): string | null => { try { return sessionStorage.getItem(MANAGED_KEY); } catch { return null; } };
const writeManagedId = (id: string) => { try { sessionStorage.setItem(MANAGED_KEY, id); } catch { /* sin storage */ } };

const Layout: React.FC<{ children: React.ReactNode, profile: Profile | null, restaurant: Restaurant | null }> = ({ children, profile, restaurant: ownRestaurant }) => {
  const location = useLocation();
  const isSuper = profile?.role === 'super_admin';
  const restaurantIdFromPath = location.pathname.match(/^\/super-admin\/restaurant\/([^/]+)/)?.[1];
  // El super admin ve las pantallas del restaurante fuera de /super-admin (rutas /orders, /menu, ...)
  const isRestaurantRoute = isSuper && !location.pathname.startsWith('/super-admin');
  const managedId = isSuper ? (restaurantIdFromPath ?? (isRestaurantRoute ? readManagedId() : null)) : null;
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  // Para el super admin, el restaurante "actual" es el que está administrando; para el resto, el suyo
  const restaurant = isSuper ? selectedRestaurant : ownRestaurant;
  const [toasts, setToasts] = useState<PaymentToast[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const paymentMethodAudioRef = useRef<HTMLAudioElement | null>(null);
  const [newBatchesCount, setNewBatchesCount] = useState(0);
  const [newBatchesByOrder, setNewBatchesByOrder] = useState<Set<string>>(new Set());
  const notifiedBatchesRef = useRef<Set<string>>(new Set()); // Para evitar notificar el mismo batch dos veces
  
  // Cargar el restaurante que el super admin está administrando (y dejarlo como restaurante global de las pantallas)
  useEffect(() => {
    if (restaurantIdFromPath) writeManagedId(restaurantIdFromPath);
  }, [restaurantIdFromPath]);

  useEffect(() => {
    if (managedId) {
      supabase.from('restaurants').select('*').eq('id', managedId).single()
        .then(({ data }) => {
          if (data) setGlobalRestaurant(data as unknown as Restaurant);
          setSelectedRestaurant(data || null);
        });
    } else {
      setSelectedRestaurant(null);
    }
  }, [managedId]);

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

  // Enlaces de administración de un restaurante (los mismos para su admin y para el super admin que lo administra)
  const restaurantNav = (close?: () => void) => (
    <>
      <SidebarLink to="/" icon={LayoutDashboard} label="Dashboard" onMobileClick={close} />
      <SidebarLink
        to="/orders"
        icon={ShoppingBag}
        label="Pedidos"
        badgeCount={newBatchesCount > 0 ? newBatchesCount : undefined}
        onNavigate={() => {
          // Limpiar notificaciones cuando se navega a Pedidos
          if (location.pathname !== '/orders') clearNewBatches();
        }}
        onMobileClick={close}
      />
      <SidebarLink to="/menu" icon={List} label="Productos" onMobileClick={close} />
      <SidebarLink to="/banners" icon={Image} label="Banners" onMobileClick={close} />
      <SidebarLink to="/promotions" icon={Percent} label="Promociones" onMobileClick={close} />
      <SidebarLink to="/tables" icon={Grid} label="Mesas" onMobileClick={close} />
      <SidebarLink to="/waiters" icon={Users} label="Meseros" onMobileClick={close} />
      <SidebarLink to="/feedback" icon={BarChart3} label="Calidad" onMobileClick={close} />
      <SidebarLink to="/ai-analysis" icon={BrainCircuit} label="Análisis AI" onMobileClick={close} />
      <SidebarLink to="/create" icon={PlusCircle} label="Añadir" onMobileClick={close} />
      <SidebarLink to="/menu-structure" icon={FolderTree} label="Estructura menú" onMobileClick={close} />
      <SidebarLink to="/settings" icon={Settings} label="Configuración" onMobileClick={close} />
    </>
  );

  const renderNav = (close?: () => void) =>
    isSuper ? (
      <>
        <SidebarLink to="/super-admin" icon={Globe} label="Inicio" onMobileClick={close} />
        {managedId && (
          <>
            <div className="px-4 py-2 mt-4 text-xs font-black text-gray-400 uppercase tracking-widest truncate">
              {selectedRestaurant?.name || 'Cargando...'}
            </div>
            <SidebarLink to={`/super-admin/restaurant/${managedId}`} icon={Store} label="Datos del restaurante" onMobileClick={close} />
            <SidebarLink to={`/super-admin/restaurant/${managedId}/users`} icon={Users} label="Usuarios" onMobileClick={close} />
            <div className="px-4 pt-4 pb-1 text-[10px] font-black text-gray-300 uppercase tracking-widest">Administración</div>
            {restaurantNav(close)}
          </>
        )}
      </>
    ) : (
      restaurantNav(close)
    );

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
      await supabase.auth.signOut({ scope: 'local' });
      // Limpiar localStorage de Supabase (signOut a veces no lo hace en localhost)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
      window.location.href = '/admin/login';
    } catch (error) {
      console.error("Error signing out:", error);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
      window.location.href = '/admin/login';
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

      {/* Overlay para cerrar el menú móvil */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Menú móvil */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col p-6 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            {restaurant?.logo_url ? (
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center border border-gray-100">
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">S</div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">Splitme</span>
              </>
            )}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={24} className="text-gray-700" />
          </button>
        </div>
        <nav className="space-y-2 flex-1">
          {renderNav(() => setIsMobileMenuOpen(false))}
        </nav>
        <button 
          onClick={() => {
            handleLogout();
            setIsMobileMenuOpen(false);
          }} 
          className="flex items-center space-x-3 text-gray-400 hover:text-red-500 transition-colors p-4 mt-auto"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Salir</span>
        </button>
      </aside>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col p-6">
          <div className="flex items-center space-x-3 mb-10 min-w-0">
            {restaurant?.logo_url ? (
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center border border-gray-100">
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0">S</div>
                <span className="text-xl font-bold text-gray-800 tracking-tight">Splitme</span>
              </>
            )}
          </div>
          <nav className="space-y-2 flex-1">
          {renderNav()}
        </nav>
          <button onClick={handleLogout} className="flex items-center space-x-3 text-gray-400 hover:text-red-500 transition-colors p-4 mt-auto">
            <LogOut size={20} />
            <span className="font-medium text-sm">Salir</span>
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 sticky top-0 z-40 flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Abrir menú"
              >
                <Menu size={24} className="text-gray-700" />
              </button>
              {restaurant && <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">{restaurant.name}</span>}
              {!restaurant && profile?.role === 'super_admin' && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">Panel Central</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-800">{profile?.full_name}</p>
                <p className="text-[10px] text-gray-400 uppercase font-black">{profile?.role}</p>
              </div>
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.id}`} className="w-8 h-8 rounded-full border-2 border-indigo-100" />
            </div>
          </header>
          <NewBatchesContext.Provider value={{ newBatchesByOrder, clearNewBatches, clearNewBatchForOrder }}>
            <div className="p-8">
              {isRestaurantRoute ? (
                managedId ? (
                  selectedRestaurant?.id === managedId ? children : (
                    <div className="flex items-center justify-center py-24"><Loader2 className="text-indigo-600 animate-spin" size={32} /></div>
                  )
                ) : <Navigate to="/super-admin" replace />
              ) : children}
            </div>
          </NewBatchesContext.Provider>
        </main>
      </div>

      <footer className="py-3 text-center text-xs text-gray-400 border-t border-gray-100 bg-white">
        Powered by Splitme <span className="text-gray-300 ml-1">· v{import.meta.env.VITE_APP_VERSION ?? '1.0.0'}</span>
      </footer>
    </div>
  );
};

// Hook para usar el contexto de nuevos batches
export const useNewBatches = () => useContext(NewBatchesContext);

// Pantallas que reciben el restaurante por prop: para el super admin se lee el restaurante que está administrando
// en el momento de dibujar (el Layout ya lo cargó), no cuando se arma el árbol de rutas.
const ManagedMenuStructurePage: React.FC = () => <MenuStructurePage restaurant={CURRENT_RESTAURANT} />;
const ManagedSettingsPage: React.FC = () => <SettingsPage restaurant={CURRENT_RESTAURANT} />;

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
    <BrowserRouter basename="/admin">
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
                    <Route path="/super-admin/restaurant/:id/users" element={<RestaurantUsersPage />} />
                    {/* Pantallas de administración del restaurante que el super admin está administrando */}
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/create" element={<CreateItemPage />} />
                    <Route path="/edit/:id" element={<CreateItemPage />} />
                    <Route path="/menu" element={<MenuListPage />} />
                    <Route path="/banners" element={<BannersPage />} />
                    <Route path="/promotions" element={<PromotionsPage />} />
                    <Route path="/tables" element={<TablesPage />} />
                    <Route path="/waiters" element={<WaitersPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/ai-analysis" element={<AiAnalysisPage />} />
                    <Route path="/menu-structure" element={<ManagedMenuStructurePage />} />
                    <Route path="/settings" element={<ManagedSettingsPage />} />
                    <Route path="*" element={<Navigate to="/super-admin" />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/orders" element={<OrdersPage />} />
                    <Route path="/create" element={<CreateItemPage />} />
                    <Route path="/edit/:id" element={<CreateItemPage />} />
                    <Route path="/menu" element={<MenuListPage />} />
                    <Route path="/banners" element={<BannersPage />} />
                    <Route path="/promotions" element={<PromotionsPage />} />
                    <Route path="/tables" element={<TablesPage />} />
                    <Route path="/waiters" element={<WaitersPage />} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/ai-analysis" element={<AiAnalysisPage />} />
                    <Route path="/menu-structure" element={<MenuStructurePage restaurant={restaurant} />} />
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
