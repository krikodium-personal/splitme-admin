
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Clock, CheckCircle2, Utensils, Hash, 
  MessageSquare, Play, Check, CircleDollarSign, 
  Timer, AlertCircle, Loader2, ChevronDown, ChevronUp, BellRing, X,
  Maximize2, Minimize2, Archive, CheckCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';

const BatchCard: React.FC<{ 
  batch: any, 
  batchIndex: number,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void 
}> = ({ batch, batchIndex, onUpdateBatchStatus }) => {
  const [isExpanded, setIsExpanded] = useState(batch.status !== 'SERVIDO');

  // Colapsar automáticamente cuando el batch se marca como SERVIDO
  useEffect(() => {
    if (batch.status === 'SERVIDO') {
      setIsExpanded(false);
    }
  }, [batch.status]);

  const statusConfig = {
    'CREADO': { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock, next: null, label: 'En creación' },
    'ENVIADO': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Play, next: 'PREPARANDO', label: 'Comenzar Preparación' },
    'PREPARANDO': { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, next: 'LISTO', label: 'Marcar Listo' },
    'LISTO': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Check, next: 'SERVIDO', label: 'Marcar Servido' },
    'SERVIDO': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2, next: null, label: 'Entregado' }
  };

  // Estado por defecto: si no existe en config, usar ENVIADO (estado inicial después de CREADO)
  const currentStatus = statusConfig[batch.status as keyof typeof statusConfig] || statusConfig['ENVIADO'];
  
  const sortedItems = [...(batch.order_items || [])].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className={`rounded-[2rem] border transition-all duration-500 mb-3 overflow-hidden ${
      batch.status === 'SERVIDO' 
        ? 'opacity-60 border-emerald-100 bg-emerald-50/10' 
        : 'shadow-sm border-gray-200 bg-white'
    }`}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-5 py-3.5 flex items-center justify-between cursor-pointer transition-colors border-b ${
          isExpanded ? 'bg-indigo-50/30 border-gray-100' : 'bg-gray-50/80 border-transparent'
        } hover:bg-indigo-50/50`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] transition-all duration-500 transform ${
            batch.status === 'SERVIDO' ? 'bg-emerald-500 text-white scale-90 rotate-[360deg]' : 'bg-slate-800 text-white shadow-md'
          }`}>
            {batch.status === 'SERVIDO' ? <CheckCircle2 size={16} /> : `#${batchIndex + 1}`}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                {batch.status === 'SERVIDO' ? `ENVÍO # ${batchIndex + 1} SERVIDO` : `ENVÍO # ${batchIndex + 1}`}
              </h4>
              {batch.status !== 'SERVIDO' && (
                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border transition-colors ${currentStatus.color}`}>
                  {batch.status}
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
              <Timer size={10} /> {new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          {currentStatus.next && (
            <button 
              onClick={() => onUpdateBatchStatus(batch.id, currentStatus.next!)}
              className={`flex items-center gap-2 px-3 py-1.5 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm active:scale-95 ${
                batch.status === 'ENVIADO' 
                  ? 'bg-red-600 hover:bg-red-700'
                  : batch.status === 'PREPARANDO'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : batch.status === 'LISTO'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <currentStatus.icon size={10} /> {currentStatus.label}
            </button>
          )}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        <div className="px-5 pb-5 pt-3 space-y-2">
          {sortedItems.map((item: any) => {
            const menuItem = Array.isArray(item.menu_items) ? item.menu_items[0] : item.menu_items;
            const itemName = menuItem?.name || 'Cargando...';
            const unitPrice = item.unit_price || 0;
            const subtotal = unitPrice * (item.quantity || 1);

            return (
              <div key={item.id} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                <div className="flex gap-3 flex-1">
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 w-6 h-6 rounded-lg flex items-center justify-center border border-indigo-100">
                    {item.quantity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {itemName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-500">
                        ${Number(unitPrice).toLocaleString('es-CL')} c/u
                      </span>
                      {item.quantity > 1 && (
                        <>
                          <span className="text-[9px] text-slate-300">×</span>
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.quantity}
                          </span>
                          <span className="text-[9px] text-slate-300">=</span>
                          <span className="text-[10px] font-black text-indigo-600">
                            ${Number(subtotal).toLocaleString('es-CL')}
                          </span>
                        </>
                      )}
                    </div>
                    {item.notes && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-amber-700 font-medium italic bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50">
                        <MessageSquare size={10} /> {item.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right ml-3">
                  {item.quantity === 1 ? (
                    <span className="text-sm font-black text-indigo-600">
                      ${Number(unitPrice).toLocaleString('es-CL')}
                    </span>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-400 line-through">
                        ${Number(unitPrice).toLocaleString('es-CL')}
                      </span>
                      <div className="text-sm font-black text-indigo-600">
                        ${Number(subtotal).toLocaleString('es-CL')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const OrderGroupCard: React.FC<{ 
  order: any, 
  onCloseOrder: (order: any) => Promise<boolean>,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  onMarkGuestAsPaid: (guestId: string) => void,
  markingGuestAsPaid: string | null,
  forceExpanded?: boolean,
  isClosed?: boolean
}> = ({ order, onCloseOrder, onUpdateBatchStatus, onMarkGuestAsPaid, markingGuestAsPaid, forceExpanded = false, isClosed: propIsClosed = false }) => {
  // Inicializamos colapsado por defecto, a menos que se fuerce la expansión
  const [isCollapsed, setIsCollapsed] = useState(!forceExpanded);
  const [isOrderClosed, setIsOrderClosed] = useState(propIsClosed);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // Filtrar lotes: no mostrar los que están en estado "CREADO"
  const batches = (order.order_batches || []).filter((batch: any) => batch.status !== 'CREADO');

  // Sincronizar con forceExpanded cuando cambie externamente (nuevo pedido)
  useEffect(() => {
    if (forceExpanded) {
      setIsCollapsed(false);
    }
  }, [forceExpanded]);

  return (
    <div className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden flex flex-col transition-all duration-500 ease-in-out h-fit animate-in fade-in slide-in-from-bottom-4 ${isCollapsed ? 'max-w-full' : ''}`}>
      <div 
        className={`p-6 cursor-pointer transition-colors duration-300 ${isCollapsed ? 'bg-slate-50/50' : 'border-b border-gray-50 bg-gray-50/30'}`}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-gray-100 font-black text-xl transition-transform duration-500 ${isCollapsed ? 'scale-90' : 'scale-100'}`}>
              {order.tables?.table_number || '??'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Mesa {order.tables?.table_number}</h3>
                {isCollapsed && (
                   <span className="px-3 py-0.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black tracking-tighter shadow-sm animate-in zoom-in-95">
                    ${Number(order.total_amount).toLocaleString('es-CL')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                <Timer size={10} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="mx-0.5 opacity-20">•</span>
                <Hash size={10} /> {order.id.slice(0, 6).toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
            {!isOrderClosed && !propIsClosed && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOrderClosed && !isClosing) {
                    setShowConfirmModal(true);
                  }
                }}
                disabled={isOrderClosed || isClosing}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all ${
                  isClosing
                    ? 'bg-amber-600 text-white shadow-amber-100 cursor-wait'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-red-100 active:scale-95 cursor-pointer'
                }`}
              >
                {isClosing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Cerrando...
                  </>
                ) : (
                  <>
                    <CircleDollarSign size={14} /> Cerrar Cuenta
                  </>
                )}
              </button>
            )}
            {(isOrderClosed || propIsClosed) && (
              <div className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100">
                <CheckCircle2 size={14} /> Cuenta Cerrada
              </div>
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
            >
              {isCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
            </button>
          </div>
          
          {/* Modal de Confirmación */}
          {showConfirmModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowConfirmModal(false)}>
              <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-red-600" size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">¿Cerrar Cuenta?</h3>
                  <p className="text-slate-600 font-medium">
                    Estás a punto de cerrar la cuenta de la <span className="font-black text-indigo-600">Mesa {order.tables?.table_number}</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    Total: <span className="font-black text-lg text-indigo-600">${Number(order.total_amount).toLocaleString('es-CL')}</span>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      setShowConfirmModal(false);
                      setIsClosing(true);
                      const success = await onCloseOrder(order);
                      if (success) {
                        setIsOrderClosed(true);
                        // Esperar un momento para que el usuario vea el cambio de estado antes de que la orden desaparezca
                        setTimeout(() => {
                          // El componente desaparecerá cuando fetchActiveOrders() se ejecute
                        }, 2000);
                      } else {
                        setIsClosing(false);
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCollapsed ? 'max-h-0' : 'max-h-[1200px]'}`}>
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white max-h-[500px]">
          {batches.length > 0 ? (
            batches.map((batch: any, idx: number) => (
              <BatchCard 
                key={batch.id} 
                batch={batch} 
                batchIndex={idx} 
                onUpdateBatchStatus={onUpdateBatchStatus} 
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-200">
              <AlertCircle size={32} strokeWidth={1} className="mb-2" />
              <p className="text-[9px] font-black uppercase tracking-widest">Esperando primer pedido...</p>
            </div>
          )}
        </div>

        <div className="px-8 py-5 bg-slate-50/50 border-t border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Acumulado</p>
              <p className="text-2xl font-black text-indigo-600 tracking-tighter">${Number(order.total_amount).toLocaleString('es-CL')}</p>
            </div>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              {batches.length} {batches.length === 1 ? 'Envío' : 'Envíos'}
            </div>
          </div>
          
          {/* Detalle de división de pago por comensal */}
          {order.order_guests?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">División de Pago</p>
              <div className="space-y-2">
                {order.order_guests.map((guest: any) => {
                  // Obtener payment_method desde order_guests (en tiempo real)
                  const paymentMethod = guest.payment_method?.toLowerCase() || null;
                  const guestTotal = guest.individual_amount || 0;
                  
                  // Verificar si está pagado: solo usar el campo paid de order_guests
                  const isPaid = guest.paid === true;
                  
                  // Determinar si necesita pago manual (solo efectivo o transferencia)
                  // Para mercadopago, no mostrar botón, solo esperar que paid=true automáticamente
                  const needsManualPayment = paymentMethod && (
                    paymentMethod === 'efectivo' || 
                    paymentMethod === 'transferencia'
                  );
                  
                  // Para mercadopago, no mostrar botón, solo el estado
                  const isMercadoPago = paymentMethod === 'mercadopago';
                  
                  return (
                    <div 
                      key={guest.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-slate-900">{guest.name || 'Sin nombre'}</p>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {isPaid ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                        {paymentMethod && (
                          <p className="text-[9px] text-slate-500 font-medium">
                            Método: <span className="font-black text-slate-700 capitalize">{paymentMethod}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-lg font-black text-indigo-600">
                            ${Number(guestTotal).toLocaleString('es-CL')}
                          </p>
                          {paymentMethod && (
                            <p className="text-[9px] text-slate-500 font-medium capitalize">
                              {paymentMethod}
                            </p>
                          )}
                        </div>
                        {/* Mostrar botón solo para efectivo o transferencia */}
                        {needsManualPayment && (
                          isPaid ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-sm whitespace-nowrap cursor-default"
                            >
                              PAGADO
                            </button>
                          ) : (
                            <button
                              onClick={() => onMarkGuestAsPaid(guest.id)}
                              disabled={markingGuestAsPaid === guest.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {markingGuestAsPaid === guest.id ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  <span>Procesando...</span>
                                </>
                              ) : (
                                'Marcar Pagado'
                              )}
                            </button>
                          )
                        )}
                        {/* Para MercadoPago, no mostrar botón, solo mostrar estado */}
                        {isMercadoPago && !isPaid && (
                          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[9px] uppercase tracking-widest whitespace-nowrap border border-blue-100">
                            Esperando Pago
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showClosedOrders, setShowClosedOrders] = useState(false);
  const [markingGuestAsPaid, setMarkingGuestAsPaid] = useState<string | null>(null);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bellAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    
    fetchActiveOrders();

    const channel = supabase
      .channel('admin-kitchen-realtime')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: CURRENT_RESTAURANT?.id ? `restaurant_id=eq.${CURRENT_RESTAURANT.id}` : undefined
      }, (payload) => {
        setExpandedOrderId(payload.new.id);
        fetchActiveOrders();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_batches' 
      }, (payload) => {
        if (bellAudioRef.current) {
          bellAudioRef.current.currentTime = 0;
          bellAudioRef.current.play().catch(() => {});
        }
        setExpandedOrderId(payload.new.order_id);
        fetchActiveOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_batches' }, fetchActiveOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchActiveOrders)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: CURRENT_RESTAURANT?.id ? `restaurant_id=eq.${CURRENT_RESTAURANT.id}` : undefined
      }, fetchActiveOrders)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'order_guests'
      }, fetchActiveOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Refrescar órdenes cuando cambie el toggle
  useEffect(() => {
    if (!loading) {
      fetchActiveOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showClosedOrders]);

  const fetchActiveOrders = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    try {
      setErrorMsg(null);
      
      // Construir la query según el toggle
      let query = supabase
        .from('orders')
        .select('*, tables(table_number), order_batches(*)')
        .eq('restaurant_id', CURRENT_RESTAURANT.id);
      
      if (showClosedOrders) {
        // Mostrar órdenes cerradas (Pagado)
        query = query.eq('status', 'Pagado');
      } else {
        // Mostrar órdenes abiertas (ABIERTO o SOLICITADO)
        query = query.or('status.eq.ABIERTO,status.eq.SOLICITADO');
      }
      
      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      if (!ordersData) { setOrders([]); return; }

      const batchIds = ordersData.flatMap(order => (order.order_batches || []).map((b: any) => b.id));
      const orderIds = ordersData.map(order => order.id);

      let itemsData: any[] = [];
      if (batchIds.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('order_items')
          .select('*, menu_items(name)')
          .in('batch_id', batchIds);
        if (itemsError) throw itemsError;
        itemsData = data || [];
      }

      // Obtener order_guests para cada orden
      let guestsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: guests, error: guestsError } = await supabase
          .from('order_guests')
          .select('*')
          .in('order_id', orderIds);
        if (guestsError) {
          console.error('Error al cargar order_guests:', guestsError);
        } else {
          guestsData = guests || [];
        }
      }

      // Obtener payments para cada orden
      let paymentsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('order_id', orderIds);
        if (paymentsError) throw paymentsError;
        paymentsData = payments || [];
      }

      const processedOrders = ordersData.map(order => {
        const orderBatches = (order.order_batches || []).map((batch: any) => ({
          ...batch,
          order_items: itemsData.filter(item => item.batch_id === batch.id)
        })).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Calcular el timestamp de la actividad más reciente (orden o último lote)
        const latestBatchTime = orderBatches.length > 0 
          ? Math.max(...orderBatches.map((b: any) => new Date(b.created_at).getTime()))
          : new Date(order.created_at).getTime();
        
        const lastActivity = Math.max(new Date(order.created_at).getTime(), latestBatchTime);

        // Obtener guests y payments para esta orden
        const orderGuests = guestsData.filter(guest => guest.order_id === order.id);
        const orderPayments = paymentsData.filter(payment => payment.order_id === order.id);

        // Combinar guests con sus payments
        const guestsWithPayments = orderGuests.map(guest => {
          const guestPayment = orderPayments.find(p => p.guest_id === guest.id);
          return {
            ...guest,
            payment: guestPayment || null
          };
        });

        return {
          ...order,
          order_batches: orderBatches,
          order_guests: guestsWithPayments,
          lastActivity
        };
      });

      // Ordenar por actividad reciente DESC
      processedOrders.sort((a, b) => b.lastActivity - a.lastActivity);

      setOrders(processedOrders);
    } catch (err: any) {
      console.error("Fetch Orders Error:", err);
      setErrorMsg(err.message || 'Error de conexión con cocina');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBatchStatus = async (batchId: string, newStatus: string) => {
    if (!batchId || !newStatus) {
      alert('Error: Datos inválidos para actualizar el batch');
      return;
    }

    try {
      const updateData: any = { status: newStatus };
      
      // Si el nuevo estado es SERVIDO, guardar el timestamp
      if (newStatus === 'SERVIDO') {
        updateData.served_at = new Date().toISOString();
      }
      
      const { data, error } = await supabase
        .from('order_batches')
        .update(updateData)
        .eq('id', batchId)
        .select();

      if (error) {
        console.error('Error al actualizar batch:', error);
        if (error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('permission')) {
          alert(
            'Error: No tienes permisos para actualizar order_batches.\n\n' +
            'Solución: Verifica las políticas RLS en Supabase para permitir UPDATE en order_batches.'
          );
        } else {
          alert("Error al actualizar el estado del batch: " + error.message);
        }
        return;
      }

      // Refrescar las órdenes para mostrar el cambio
      await fetchActiveOrders();
    } catch (err: any) {
      console.error('Error completo al actualizar batch:', err);
      alert("Error al actualizar el estado del batch: " + (err.message || 'Error desconocido'));
    }
  };

  const handleMarkGuestAsPaid = async (guestId: string) => {
    if (!guestId) {
      alert('Error: ID de guest no válido');
      return;
    }

    // Activar estado de loading
    setMarkingGuestAsPaid(guestId);

    try {
      // Intentar primero con función RPC (bypassa RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc('mark_guest_as_paid', {
        guest_id: guestId
      });
      
      if (rpcError) {
        // Si la función RPC no existe o falla, intentar con update directo
        console.warn('Función RPC no disponible, intentando update directo:', rpcError.message);
        
        const { data, error } = await supabase
          .from('order_guests')
          .update({ paid: true })
          .eq('id', guestId)
          .select();
        
        if (error) {
          console.error('Error al actualizar order_guests:', error);
          setMarkingGuestAsPaid(null); // Desactivar loading en caso de error
          if (error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('permission')) {
            alert(
              'Error: No tienes permisos para actualizar order_guests.\n\n' +
              'Solución: Ejecuta el script "mark_guest_as_paid_function.sql" en el SQL Editor de Supabase\n' +
              'O ejecuta "add_order_guests_paid_policy.sql" para agregar políticas RLS de UPDATE.'
            );
          } else {
            alert("Error al marcar como pagado: " + error.message);
          }
          return;
        }
      }
      
      // Refrescar las órdenes para mostrar el cambio
      await fetchActiveOrders();
    } catch (err: any) {
      console.error('Error completo al marcar como pagado:', err);
      setMarkingGuestAsPaid(null); // Desactivar loading en caso de error
      alert("Error al marcar como pagado: " + (err.message || 'Error desconocido'));
    } finally {
      // Desactivar loading después de completar (con un pequeño delay para que se vea el cambio)
      setTimeout(() => {
        setMarkingGuestAsPaid(null);
      }, 500);
    }
  };

  const handleCloseOrder = async (order: any): Promise<boolean> => {
    const batches = order.order_batches || [];
    const allServidos = batches.every((b: any) => b.status === 'SERVIDO');

    if (!allServidos) {
      setErrorMsg("Para poder cerrar una mesa, asegurate que todos los lotes estén marcados como \"servido\"");
      return false;
    }
    
    try {
      setErrorMsg(null);
      
      // Actualizar el status a 'Pagado' (consistente con DashboardPage y RestaurantDetailsPage)
      console.log('🔄 Cerrando orden:', order.id, 'Status actual:', order.status, 'Restaurant ID:', CURRENT_RESTAURANT?.id);
      
      // Intentar usar función RPC primero (si existe), si no, usar update directo
      console.log('🔄 Cerrando orden:', order.id, 'Status actual:', order.status);
      
      // Intentar con función RPC (bypasea RLS)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('close_order', {
        order_id: order.id,
        restaurant_id_param: CURRENT_RESTAURANT?.id || ''
      });
      
      if (!rpcError && rpcResult && !rpcResult.error) {
        console.log('✅ Orden cerrada usando RPC:', rpcResult);
        // La función RPC ya actualizó el status, continuar
      } else {
        // Si la función RPC no existe o falla, intentar update directo
        console.log('⚠️ RPC no disponible, intentando update directo...');
        
        const { error: orderError, data: updatedData } = await supabase
          .from('orders')
          .update({ status: 'Pagado' })
          .eq('id', order.id)
          .eq('restaurant_id', CURRENT_RESTAURANT?.id || '')
          .select('id, status');
        
        if (orderError) {
          console.error("❌ Error updating order:", orderError);
          throw orderError;
        }
        
        if (!updatedData || updatedData.length === 0) {
          throw new Error('La actualización no afectó ninguna fila. Esto indica un problema de políticas RLS. Por favor, ejecuta el SQL en supabase_rpc_function.sql en el SQL Editor de Supabase para crear la función RPC necesaria.');
        }
        
        console.log('✅ Update ejecutado directamente:', updatedData[0]);
      }
      
      // Esperar un momento para que la actualización se propague
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar que la actualización se guardó correctamente
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, status, restaurant_id')
        .eq('id', order.id)
        .eq('restaurant_id', CURRENT_RESTAURANT?.id || '')
        .single();
      
      if (verifyError) {
        console.error("❌ Error verificando orden:", verifyError);
        throw new Error(`No se pudo verificar la actualización: ${verifyError.message}`);
      }
      
      console.log('✅ Status verificado:', verifyOrder?.status);
      
      if (verifyOrder?.status !== 'Pagado') {
        console.error('❌ El status no se actualizó correctamente. Status actual:', verifyOrder?.status);
        throw new Error(`El status no se actualizó. Status actual: ${verifyOrder?.status}, esperado: Pagado`);
      }

      // Liberar la mesa
      if (order.table_id) {
        console.log('🔄 Liberando mesa:', order.table_id);
        const { data: updatedTable, error: tableError } = await supabase
          .from('tables')
          .update({ status: 'Libre' })
          .eq('id', order.table_id)
          .eq('restaurant_id', CURRENT_RESTAURANT?.id || '')
          .select('id, status');
        
        if (tableError) {
          console.error("❌ Error al liberar mesa:", tableError);
          throw new Error(`No se pudo liberar la mesa: ${tableError.message}`);
        }
        
        if (!updatedTable || updatedTable.length === 0) {
          console.warn("⚠️ La actualización de la mesa no afectó ninguna fila");
          throw new Error('No se pudo actualizar el estado de la mesa. Verifica los permisos RLS.');
        }
        
        console.log('✅ Mesa liberada correctamente:', updatedTable[0]);
      }

      // Archivar la orden y todos sus datos relacionados
      // Esto mueve order_items, order_batches, order_guests a tablas de historial
      // y elimina los registros de las tablas activas para mantener el rendimiento
      console.log('📦 Archivando orden y datos relacionados...');
      const { data: archiveResult, error: archiveError } = await supabase.rpc('archive_order', {
        order_id: order.id,
        restaurant_id_param: CURRENT_RESTAURANT?.id || ''
      });

      if (archiveError) {
        console.warn("⚠️ Error al archivar orden (no crítico):", archiveError);
        // No lanzamos error aquí porque la orden ya está cerrada
        // El archivado puede hacerse manualmente después si es necesario
      } else if (archiveResult && archiveResult.success) {
        console.log('✅ Orden archivada correctamente:', {
          archived_records: archiveResult.archived_records,
          archived_at: archiveResult.archived_at
        });
      } else {
        console.warn("⚠️ La función de archivado no está disponible aún. Ejecuta archive_order_function.sql en Supabase.");
      }

      // Refrescar las órdenes activas después de un pequeño delay para que el usuario vea el cambio
      setTimeout(async () => {
        await fetchActiveOrders();
      }, 1500);
      
      return true;

    } catch (err: any) {
      console.error("Error al cerrar la cuenta:", err);
      setErrorMsg("No se pudo cerrar la cuenta: " + (err.message || 'Error desconocido'));
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Sincronizando cocina...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            Kitchen Monitor <BellRing className="text-indigo-600 animate-pulse" size={32} />
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {showClosedOrders ? 'Órdenes cerradas y pagadas' : 'Operaciones activas en salón y cocina'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Toggle Switch */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setShowClosedOrders(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                !showClosedOrders
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-indigo-600'
              }`}
            >
              <BellRing size={14} /> Abiertas
            </button>
            <button
              onClick={() => setShowClosedOrders(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                showClosedOrders
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <Archive size={14} /> Cerradas
            </button>
          </div>
          <div className={`min-w-[200px] px-6 py-4 rounded-2xl border border-gray-100 shadow-sm ${
            showClosedOrders 
              ? 'bg-emerald-50 border-emerald-100' 
              : 'bg-indigo-50 border-indigo-100'
          }`}>
            <div className={`text-3xl font-black tracking-tighter ${
              showClosedOrders ? 'text-emerald-600' : 'text-indigo-600'
            }`}>
              {orders.length}
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
              showClosedOrders ? 'text-emerald-600' : 'text-indigo-600'
            }`}>
              {showClosedOrders ? 'Órdenes Cerradas' : 'Mesas Activas'}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-center gap-4 text-rose-600 animate-shake">
          <AlertCircle size={24} />
          <div className="flex-1">
            <p className="font-black text-xs uppercase tracking-widest">Atención Requerida</p>
            <p className="text-sm font-bold opacity-80">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-rose-100 rounded-full">
            <X size={18} />
          </button>
        </div>
      )}

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8 items-start">
          {orders.map(order => (
            <OrderGroupCard 
              key={order.id} 
              order={order} 
              onCloseOrder={handleCloseOrder}
              onUpdateBatchStatus={handleUpdateBatchStatus}
              onMarkGuestAsPaid={handleMarkGuestAsPaid}
              markingGuestAsPaid={markingGuestAsPaid}
              forceExpanded={order.id === expandedOrderId}
              isClosed={showClosedOrders || order.status === 'Pagado'}
            />
          ))}
        </div>
      ) : (
        <div className="py-40 flex flex-col items-center justify-center bg-white rounded-[4rem] border border-dashed border-gray-200 text-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
              <Utensils size={40} />
           </div>
           <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">Cocina en calma</h3>
           <p className="text-xs text-slate-400 mt-2 font-medium">Los pedidos aparecerán aquí automáticamente</p>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
