
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Clock, CheckCircle2, Utensils, Hash, 
  MessageSquare, Play, Check, CircleDollarSign, 
  Timer, AlertCircle, Loader2, ChevronDown, ChevronUp, BellRing, X,
  Maximize2, Minimize2, Archive, CheckCircle
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';

const BatchCard: React.FC<{ 
  batch: any, 
  batchIndex: number,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  isArchived?: boolean
}> = ({ batch, batchIndex, onUpdateBatchStatus, isArchived = false }) => {
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

        <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
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
  onCloseMesa: (order: any) => Promise<void>,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  onMarkGuestAsPaid: (guestId: string) => void,
  markingGuestAsPaid: string | null,
  forceExpanded?: boolean,
  isClosed?: boolean
}> = ({ order, onCloseMesa, onUpdateBatchStatus, onMarkGuestAsPaid, markingGuestAsPaid, forceExpanded = false, isClosed: propIsClosed = false }) => {
  // Inicializamos colapsado por defecto, a menos que se fuerce la expansión
  const [isCollapsed, setIsCollapsed] = useState(!forceExpanded);
  // Filtrar lotes: no mostrar los que están en estado "CREADO"
  const batches = (order.order_batches || []).filter((batch: any) => batch.status !== 'CREADO');

  // Para la lógica de estado, usar todos los batches (incluyendo CREADO)
  const allBatches = order.order_batches || [];

  // Calcular el estado de la mesa según los criterios:
  // Abierta: Tiene batches en CREADO, ENVIADO, PREPARANDO y/o algún guest tiene paid=FALSE con individual_amount > 0
  // Pagada: Todos los guests tienen paid=TRUE y order status='Pagado'
  // Cerrada: Todos los batches en SERVIDO, todos los guests paid=TRUE y order status='CERRADO'
  
  const orderGuests = order.order_guests || [];
  
  // Verificar si hay batches en estados que indican que la mesa está abierta (usar allBatches para incluir CREADO)
  // IMPORTANTE: Solo considerar batches que NO están en CREADO para determinar si la mesa está abierta
  // Los batches en CREADO no cuentan como "abiertos" para la lógica de estado
  const batchesForStatusCheck = allBatches.filter((b: any) => b.status !== 'CREADO');
  const hasOpenBatches = batchesForStatusCheck.some((b: any) =>
    ['ENVIADO', 'PREPARANDO'].includes(b.status)
  );
  
  // Verificar si hay batches en CREADO para mostrar el mensaje "Pidiendo"
  const hasBatchesCreado = allBatches.some((b: any) => b.status === 'CREADO');

  // Verificar si todos los batches están en SERVIDO (excluyendo CREADO)
  const batchesToCheck = allBatches.filter((b: any) => b.status !== 'CREADO');
  const allBatchesServed = batchesToCheck.length === 0 || batchesToCheck.every((b: any) => b.status === 'SERVIDO');

  // Calcular la suma de los individual_amount de los guests con paid=TRUE
  const totalPaidAmount = orderGuests
    .filter((g: any) => g.paid === true)
    .reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);

  // Verificar si el total_amount es igual a la suma de los individual_amount de los guests pagados
  const totalAmount = Number(order.total_amount) || 0;
  const isTotalAmountPaid = totalAmount > 0 && Math.abs(totalPaidAmount - totalAmount) < 0.01; // Usar comparación con tolerancia para decimales

  
  // Verificar si hay guests sin pagar (paid=FALSE y individual_amount > 0)
  // IMPORTANTE: Solo considerar como "sin pagar" si la suma de los pagados NO cubre el total
  // Si el total ya está cubierto por los guests pagados, no importa si hay guests sin pagar
  const hasUnpaidGuests = !isTotalAmountPaid && orderGuests.some((g: any) =>
    g.paid === false && (Number(g.individual_amount) || 0) > 0
  );
  
  
  
  // Verificar si todos los guests están pagados (para otros estados)
  const allGuestsPaid = orderGuests.length === 0 || orderGuests.every((g: any) => g.paid === true);
  
  // Determinar el estado de la mesa según los criterios (con prioridad)
  // PRIORIDAD 0: Si el status de la orden es 'CERRADO' → CERRADA (siempre, independientemente de batches o pagos)
  let isMesaCerrada = order.status === 'CERRADO';
  
  // PRIORIDAD 1: Si hay batches abiertos (ENVIADO, PREPARANDO) o guests sin pagar → ABIERTA (siempre)
  // NOTA: Los batches en CREADO NO cuentan como "abiertos" para esta lógica
  // NOTA: Si la mesa ya está cerrada, no la marcamos como abierta
  const isMesaAbierta = !isMesaCerrada && (hasOpenBatches || hasUnpaidGuests);
  
  // PRIORIDAD 2: Solo si NO hay batches abiertos ni guests sin pagar, verificar otros estados
  let isMesaPagada = false;
  let isMesaListaParaCerrar = false;
  
  if (!isMesaCerrada && !isMesaAbierta) {
    // Si todos los batches están servidos Y el total_amount es igual a la suma de los individual_amount de los guests pagados
    if (allBatchesServed && isTotalAmountPaid) {
      // Si el status es 'Pagado' → PAGADA
      if (order.status === 'Pagado') {
        isMesaPagada = true;
      }
      // Si el status no es ninguno de esos → LISTA PARA CERRAR
      else {
        isMesaListaParaCerrar = true;
      }
    }
  }
  
  // Para el mensaje y el botón, usamos estas variables
  const isOrderClosed = order.status === 'CERRADO';

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

          <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isMesaCerrada ? 'text-emerald-600' : isMesaPagada ? 'text-blue-600' : 'text-red-600'
              }`}>
                {isMesaCerrada ? 'MESA CERRADA' : isMesaPagada ? 'MESA PAGADA' : isMesaListaParaCerrar ? 'LISTA PARA CERRAR' : 'MESA ABIERTA'}
              </span>
              {isMesaListaParaCerrar && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onCloseMesa(order);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                >
                  Cerrar mesa
                </button>
              )}
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
              >
                {isCollapsed ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
            </div>
            {hasBatchesCreado && (
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                Pidiendo
              </span>
            )}
          </div>
           
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
                isArchived={propIsClosed}
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
          {order.order_guests?.length > 0 && (() => {
            // Filtrar comensales con saldo $0 si la suma del resto es igual al total
            const guestsWithAmount = order.order_guests.filter((g: any) => (g.individual_amount || 0) > 0);
            const sumOfGuestsWithAmount = guestsWithAmount.reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);
            const totalAmount = Number(order.total_amount || 0);
            
            // Si la suma de los comensales con monto es igual al total, ocultar los de $0
            const guestsToShow = (sumOfGuestsWithAmount === totalAmount && totalAmount > 0)
              ? guestsWithAmount
              : order.order_guests;
            
            return guestsToShow.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">División de Pago</p>
                <div className="space-y-2">
                  {guestsToShow.map((guest: any) => {
                  // Obtener payment_method desde order_guests (en tiempo real)
                  const paymentMethod = guest.payment_method?.toLowerCase() || null;
                  const guestTotal = guest.individual_amount || 0;

                  // Verificar si está pagado: solo usar el campo paid de order_guests
                  const isPaid = guest.paid === true;

                  // Obtener payment_id directamente de order_guests
                  const paymentId = guest.payment_id || null;

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
                            {isMercadoPago && isPaid && paymentId && (
                              <span className="ml-2 text-indigo-600">ID: {paymentId}</span>
                            )}
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
                              {isMercadoPago && isPaid && paymentId ? (
                                <span className="text-indigo-600 font-black">ID: {paymentId}</span>
                              ) : (
                                paymentMethod
                              )}
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
                          ) : !propIsClosed ? (
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
                          ) : null
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
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
};

const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const showClosedOrders = searchParams.get('closed') === 'true';
  const [markingGuestAsPaid, setMarkingGuestAsPaid] = useState<string | null>(null);
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [archivingOrders, setArchivingOrders] = useState(false);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

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
        // Solo actualizar si estamos viendo órdenes abiertas
        if (!showClosedOrders) {
          setExpandedOrderId(payload.new.id);
          fetchActiveOrders();
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_batches' 
      }, (payload) => {
        // Solo actualizar si estamos viendo órdenes abiertas
        if (!showClosedOrders) {
          if (bellAudioRef.current) {
            bellAudioRef.current.currentTime = 0;
            bellAudioRef.current.play().catch(() => {});
          }
          setExpandedOrderId(payload.new.order_id);
          fetchActiveOrders();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_batches' }, () => {
        // Solo actualizar si estamos viendo órdenes abiertas
        if (!showClosedOrders) {
          fetchActiveOrders();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        // Solo actualizar si estamos viendo órdenes abiertas
        if (!showClosedOrders) {
          fetchActiveOrders();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: CURRENT_RESTAURANT?.id ? `restaurant_id=eq.${CURRENT_RESTAURANT.id}` : undefined
      }, () => {
        // Solo actualizar si estamos viendo órdenes abiertas
        if (!showClosedOrders) {
          fetchActiveOrders();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'order_guests'
      }, () => {
        // Solo actualizar si estamos viendo órdenes abiertas
        if (!showClosedOrders) {
          fetchActiveOrders();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showClosedOrders]);

  // Refrescar órdenes cuando cambie el toggle
  useEffect(() => {
    if (!loading) {
      setToggleLoading(true);
      fetchActiveOrders().finally(() => {
        setToggleLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showClosedOrders]);

  const fetchActiveOrders = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    try {
      setErrorMsg(null);

      // Determinar qué tablas usar según el toggle
      const ordersTable = showClosedOrders ? 'orders_archive' : 'orders';
      const batchesTable = showClosedOrders ? 'order_batches_archive' : 'order_batches';
      const itemsTable = showClosedOrders ? 'order_items_archive' : 'order_items';
      const guestsTable = showClosedOrders ? 'order_guests_archive' : 'order_guests';
      const paymentsTable = showClosedOrders ? 'payments_archive' : 'payments';

      // Construir la query según el toggle
      console.log('🔍 fetchActiveOrders - showClosedOrders:', showClosedOrders, 'ordersTable:', ordersTable);

      let query = supabase
        .from(ordersTable)
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id);

      if (showClosedOrders) {
        // Mostrar todas las órdenes archivadas (sin filtro de status)
        // Las órdenes archivadas ya están todas cerradas
        // No aplicamos ningún filtro adicional
        console.log('📦 Consultando orders_archive (sin filtros)');
      } else {
        // Mostrar órdenes abiertas (ABIERTO, SOLICITADO, Pagado o CERRADO)
        query = query.or('status.eq.ABIERTO,status.eq.SOLICITADO,status.eq.Pagado,status.eq.CERRADO');
        console.log('📋 Consultando orders (con filtro ABIERTO/SOLICITADO/Pagado/CERRADO)');
      }

      const { data: ordersData, error: ordersError } = await query;

      // Debug: verificar qué tabla se está consultando
      console.log(`✅ Consulta completada. Tabla: ${ordersTable}, Órdenes encontradas:`, ordersData?.length || 0);
      if (ordersData && ordersData.length > 0) {
        console.log('📊 Primeras órdenes:', ordersData.slice(0, 3).map(o => ({ id: o.id, status: o.status, table_id: o.table_id })));
      }

      if (ordersError) throw ordersError;
      if (!ordersData) { setOrders([]); return; }

      const orderIds = ordersData.map(order => order.id);

      // Obtener información de las mesas por separado (ya que no hay relación directa con orders_archive)
      const tableIds = [...new Set(ordersData.map(order => order.table_id).filter(Boolean))];
      let tablesData: any[] = [];
      if (tableIds.length > 0) {
        const { data: tables, error: tablesError } = await supabase
          .from('tables')
          .select('id, table_number')
          .in('id', tableIds);
        if (tablesError) {
          console.error('Error al cargar tables:', tablesError);
        } else {
          tablesData = tables || [];
        }
      }

      // Obtener batches por separado (ya que no podemos hacer join entre tablas diferentes)
      let batchesData: any[] = [];
      if (orderIds.length > 0) {
        const { data: batches, error: batchesError } = await supabase
          .from(batchesTable)
          .select('*')
          .in('order_id', orderIds);
        if (batchesError) {
          console.error('Error al cargar batches:', batchesError);
        } else {
          batchesData = batches || [];
        }
      }

      const batchIds = batchesData.map(batch => batch.id);

      let itemsData: any[] = [];
      if (batchIds.length > 0) {
        // Obtener items sin el join con menu_items (ya que no hay relación directa con _archive)
        const { data: items, error: itemsError } = await supabase
          .from(itemsTable)
          .select('*')
          .in('batch_id', batchIds);
        if (itemsError) throw itemsError;
        itemsData = items || [];

        // Obtener menu_items por separado si hay items
        if (itemsData.length > 0) {
          const menuItemIds = [...new Set(itemsData.map(item => item.menu_item_id).filter(Boolean))];
          if (menuItemIds.length > 0) {
            const { data: menuItems, error: menuItemsError } = await supabase
              .from('menu_items')
              .select('id, name')
              .in('id', menuItemIds);
            if (menuItemsError) {
              console.error('Error al cargar menu_items:', menuItemsError);
            } else {
              // Combinar menu_items con items
              itemsData = itemsData.map(item => {
                const menuItem = menuItems?.find(mi => mi.id === item.menu_item_id);
                return {
                  ...item,
                  menu_items: menuItem ? { name: menuItem.name } : null
                };
              });
            }
          }
        }
      }

      // Obtener order_guests para cada orden
      let guestsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: guests, error: guestsError } = await supabase
          .from(guestsTable)
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
          .from(paymentsTable)
          .select('*')
          .in('order_id', orderIds);
        if (paymentsError) throw paymentsError;
        paymentsData = payments || [];
      }

      const processedOrders = ordersData.map(order => {
        // Obtener batches para esta orden
        const orderBatches = batchesData
          .filter(batch => batch.order_id === order.id)
          .map((batch: any) => ({
            ...batch,
            order_items: itemsData.filter(item => item.batch_id === batch.id)
          }))
          .sort((a: any, b: any) => 
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

        // Obtener información de la mesa
        const tableInfo = tablesData.find(table => table.id === order.table_id);

        return {
          ...order,
          tables: tableInfo ? { table_number: tableInfo.table_number } : null,
          order_batches: orderBatches,
          order_guests: guestsWithPayments,
          lastActivity
        };
      });

      // Filtrar órdenes abiertas: excluir aquellas que solo tienen batches con status 'CREADO'
      // Solo aplicar este filtro cuando estamos viendo órdenes abiertas (no cerradas)
      let filteredOrders = processedOrders;
      if (!showClosedOrders) {
        filteredOrders = processedOrders.filter(order => {
          const batches = order.order_batches || [];
          // Si no tiene batches, no mostrar
          if (batches.length === 0) {
            return false;
          }
          // Si tiene batches, verificar si al menos uno NO es 'CREADO'
          const hasNonCreatedBatch = batches.some((batch: any) => batch.status !== 'CREADO');
          return hasNonCreatedBatch;
        });
        console.log(`🔍 Filtrado: ${processedOrders.length} órdenes → ${filteredOrders.length} órdenes (excluidas las que solo tienen batches CREADO)`);
      }

      // Ordenar por actividad reciente DESC
      filteredOrders.sort((a, b) => b.lastActivity - a.lastActivity);

      setOrders(filteredOrders);
    } catch (err: any) {
      console.error("Fetch Orders Error:", err);
      setErrorMsg(err.message || 'Error de conexión con cocina');
    } finally {
      setLoading(false);
      setToggleLoading(false);
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
    const orderGuests = order.order_guests || [];

    // Filtrar batches que no sean 'CREADO' (solo considerar batches que ya fueron enviados)

    // Verificar que todos los batches (excluyendo 'CREADO') estén en 'SERVIDO'
    // Si hay batches para verificar, todos deben estar SERVIDO
    // Si solo hay batches con status 'CREADO', no hay nada que verificar
    const allServidos = batchesToCheck.length === 0 || batchesToCheck.every((b: any) => b.status === 'SERVIDO');

    // Verificar que no haya batches con otros status (que no sean CREADO ni SERVIDO)
    const hasOtherStatus = batchesToCheck.some((b: any) => b.status !== 'SERVIDO');

    // Verificar que todos los order_guests tengan paid=true
    const allPaid = orderGuests.length === 0 || orderGuests.every((g: any) => g.paid === true);

    if (hasOtherStatus || !allServidos) {
      setErrorMsg("Para poder cerrar una mesa, asegurate que todos los lotes estén marcados como \"servido\"");
      return false;
    }

    if (!allPaid) {
      setErrorMsg("Para poder cerrar una mesa, asegurate que todas las divisiones de pago estén marcadas como pagadas");
      return false;
    }

    try {
      setErrorMsg(null);

      // ============================================
      // PASO 1: Cambiar el status de la orden a 'Pagado'
      // ============================================
      // Esto activará el trigger que actualiza dashboard_daily_summary y dashboard_order_events
      console.log('🔄 PASO 1: Cambiando status a "Pagado"...', order.id, 'Restaurant ID:', CURRENT_RESTAURANT?.id);

      // Intentar usar función RPC primero (si existe), si no, usar update directo
      const { data: rpcResult, error: rpcError } = await supabase.rpc('close_order', {
        order_id: order.id,
        restaurant_id_param: CURRENT_RESTAURANT?.id || ''
      });

      if (!rpcError && rpcResult && !rpcResult.error) {
        console.log('✅ Status actualizado usando RPC:', rpcResult);
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

        console.log('✅ Status actualizado directamente:', updatedData[0]);
      }

      // Esperar a que el trigger se ejecute y actualice las tablas del dashboard
      // El trigger se ejecuta automáticamente cuando cambia el status a 'Pagado'
      console.log('⏳ Esperando a que el trigger actualice las tablas del dashboard...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Dar tiempo suficiente al trigger

      // Verificar que la actualización se guardó correctamente
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, status, restaurant_id')
        .eq('id', order.id)
        .eq('restaurant_id', CURRENT_RESTAURANT?.id || '')
      // Nota: No usamos .single() porque puede fallar si RLS bloquea el update
        ;

      if (verifyError) {
        console.error("❌ Error verificando orden:", verifyError);
        throw new Error(`No se pudo verificar la actualización: ${verifyError.message}`);
      }

      console.log('✅ Status verificado:', verifyOrder?.status);

      if (verifyOrder?.status !== 'Pagado') {
        console.error('❌ El status no se actualizó correctamente. Status actual:', verifyOrder?.status);
        throw new Error(`El status no se actualizó. Status actual: ${verifyOrder?.status}, esperado: Pagado`);
      }

      // ============================================
      // PASO 2: El trigger ya actualizó dashboard_daily_summary y dashboard_order_events
      // ============================================
      // El trigger 'trg_record_dashboard_order_event' se ejecutó automáticamente
      // cuando cambió el status a 'Pagado' en el PASO 1
      console.log('✅ PASO 2: Trigger ejecutado - dashboard actualizado automáticamente');

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

      // ============================================
      // PASO 3: Archivar la orden y todos sus datos relacionados
      // ============================================
      // Esto mueve order_items, order_batches, order_guests a tablas de historial
      // y elimina los registros de las tablas activas para mantener el rendimiento
      // IMPORTANTE: Esto se hace DESPUÉS de que el trigger actualice el dashboard
      console.log('📦 PASO 3: Archivando orden y datos relacionados...', {
        order_id: order.id,
        restaurant_id: CURRENT_RESTAURANT?.id
      });

      try {
        const { data: archiveResult, error: archiveError } = await supabase.rpc('archive_order', {
          order_id: order.id,
          restaurant_id_param: CURRENT_RESTAURANT?.id || ''
        });

        console.log('📦 Resultado del archivado:', { archiveResult, archiveError });

        if (archiveError) {
          // Mostrar el error completo para debugging
          console.error("❌ Error al archivar orden:", {
            message: archiveError.message,
            details: archiveError.details,
            hint: archiveError.hint,
            code: archiveError.code
          });

          // Si el error es que la función no existe, mostrar mensaje claro
          if (archiveError.message?.includes('function') || 
              archiveError.message?.includes('does not exist') ||
              archiveError.code === '42883') {
            const errorMsg = "⚠️ La función de archivado no está disponible. Ejecuta archive_order_function.sql en Supabase SQL Editor.";
            console.warn(errorMsg);
            setErrorMsg(errorMsg);
            // No lanzamos error aquí porque la orden ya está cerrada
            // El archivado puede hacerse manualmente después si es necesario
          } else {
            // Otros errores también se muestran al usuario
            setErrorMsg(`⚠️ La orden se cerró pero no se pudo archivar: ${archiveError.message}`);
          }
        } else if (archiveResult) {
          if (archiveResult.success) {
            console.log('✅ Orden archivada correctamente:', {
              order_id: archiveResult.order_id,
              archived_records: archiveResult.archived_records,
              archived_at: archiveResult.archived_at
            });
          } else {
            const errorMsg = `⚠️ El archivado no fue exitoso: ${archiveResult.error || 'Error desconocido'}`;
            console.warn(errorMsg);
            setErrorMsg(errorMsg);
          }
        } else {
          // No hay resultado ni error, algo raro pasó
          console.warn("⚠️ El archivado no devolvió resultado ni error");
          setErrorMsg("⚠️ La orden se cerró pero el archivado no devolvió resultado. Verifica en Supabase.");
        }
      } catch (archiveErr: any) {
        // Capturar cualquier error inesperado en el archivado
        console.error("❌ Error inesperado al archivar:", archiveErr);
        setErrorMsg(`⚠️ Error inesperado al archivar: ${archiveErr.message || 'Error desconocido'}`);
        // No lanzamos error porque la orden ya está cerrada correctamente
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

  const handleCloseMesa = async (order: any): Promise<void> => {
    if (!CURRENT_RESTAURANT?.id) {
      setErrorMsg("No hay restaurante seleccionado");
      return;
    }

    try {
      setClosingOrderId(order.id);
      setErrorMsg(null);
      console.log('🔄 Cerrando mesa - Cambiando status a "CERRADO"...', order.id);

      // Usar la nueva función RPC para cerrar la orden
      const { data: rpcResult, error: rpcError } = await supabase.rpc('close_order_as_cerrado', {
        order_id: order.id,
        restaurant_id_param: CURRENT_RESTAURANT.id
      });

      if (rpcError) {
        console.error("❌ Error al llamar la función RPC:", rpcError);
        setErrorMsg("No se pudo cerrar la mesa: " + (rpcError.message || 'Error desconocido'));
        
        // Si la función no existe, mostrar mensaje específico
        if (rpcError.message?.includes('function') || rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
          setErrorMsg("⚠️ La función de cerrar orden no está disponible. Ejecuta close_order_cerrado_function.sql en Supabase SQL Editor.");
        }
        return;
      }

      if (rpcResult && rpcResult.error) {
        console.error("❌ Error en la función RPC:", rpcResult.error);
        setErrorMsg("No se pudo cerrar la mesa: " + (rpcResult.error || 'Error desconocido'));
        return;
      }

      if (!rpcResult) {
        console.error("❌ La función RPC no devolvió resultado");
        setErrorMsg("No se pudo cerrar la mesa: La función no devolvió resultado");
        return;
      }

      console.log('✅ Orden cerrada usando RPC:', rpcResult);
      
      // Verificar que el status se actualizó correctamente
      const validClosedStatuses = ['CERRADO', 'Pagado'];
      if (rpcResult.status && !validClosedStatuses.includes(rpcResult.status)) {
        console.error("❌ El status no se actualizó correctamente. Status actual:", rpcResult.status);
        setErrorMsg(`El status no se actualizó. Status actual: ${rpcResult.status}, esperado: CERRADO o Pagado`);
        return;
      }

      console.log(`✅ Orden cerrada correctamente con status: ${rpcResult.status || 'CERRADO'}`);
      console.log('✅ Mesa cerrada correctamente');
      
      // Refrescar las órdenes
      await fetchActiveOrders();
    } catch (err: any) {
      console.error("Error al cerrar la mesa:", err);
      setErrorMsg("No se pudo cerrar la mesa: " + (err.message || 'Error desconocido'));
    } finally {
      setClosingOrderId(null);
    }
  };

  const handleArchiveClosedOrders = async (): Promise<void> => {
    if (!CURRENT_RESTAURANT?.id) {
      setErrorMsg("No hay restaurante seleccionado");
      return;
    }

    try {
      setArchivingOrders(true);
      setErrorMsg(null);
      console.log('📦 Archivando órdenes cerradas...', CURRENT_RESTAURANT.id);

      // Usar la función RPC para archivar todas las órdenes con status CERRADO
      const { data: archiveResult, error: archiveError } = await supabase.rpc('archive_closed_orders', {
        p_restaurant_id: CURRENT_RESTAURANT.id
      });

      if (archiveError) {
        console.error("❌ Error al archivar órdenes:", archiveError);
        setErrorMsg("No se pudieron archivar las órdenes: " + (archiveError.message || 'Error desconocido'));
        
        // Si la función no existe, mostrar mensaje específico
        if (archiveError.message?.includes('function') || archiveError.message?.includes('does not exist') || archiveError.code === '42883') {
          setErrorMsg("⚠️ La función de archivado no está disponible. Ejecuta archive_closed_orders_function.sql en Supabase SQL Editor.");
        }
        return;
      }

      if (archiveResult && archiveResult.error) {
        console.error("❌ Error en la función RPC:", archiveResult.error);
        setErrorMsg("No se pudieron archivar las órdenes: " + (archiveResult.error || 'Error desconocido'));
        return;
      }

      if (!archiveResult) {
        console.error("❌ La función RPC no devolvió resultado");
        setErrorMsg("No se pudieron archivar las órdenes: La función no devolvió resultado");
        return;
      }

      if (archiveResult.success) {
        console.log('✅ Órdenes archivadas correctamente:', archiveResult);
        const totalArchived = archiveResult.archived_orders || 0;
        setErrorMsg(`✅ Se archivaron ${totalArchived} orden${totalArchived !== 1 ? 'es' : ''} correctamente`);
        
        // Refrescar las órdenes después de un breve delay
        setTimeout(async () => {
          await fetchActiveOrders();
          setErrorMsg(null);
        }, 2000);
      } else {
        console.error("❌ El archivado no fue exitoso:", archiveResult);
        setErrorMsg(`⚠️ El archivado no fue exitoso: ${archiveResult.error || 'Error desconocido'}`);
      }
    } catch (err: any) {
      console.error("Error al archivar órdenes:", err);
      setErrorMsg("No se pudieron archivar las órdenes: " + (err.message || 'Error desconocido'));
    } finally {
      setArchivingOrders(false);
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
      <div className="flex flex-col gap-6">
        <div>
        {/* Título y subtítulo */}
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
            Kitchen Monitor <BellRing className="text-indigo-600 animate-pulse" size={32} />
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {showClosedOrders ? 'Órdenes archivadas y pagadas' : 'Operaciones activas en salón y cocina'}
          </p>
        </div>
        {/* Controles: Toggle y contador */}
        <div className="flex items-center gap-4">
          {/* Botón Archivar (solo visible en vista Abiertas) */}
          {!showClosedOrders && (
            <button
              onClick={handleArchiveClosedOrders}
              disabled={archivingOrders}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {archivingOrders ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Archivando...</span>
                </>
              ) : (
                <>
                  <Archive size={14} />
                  <span>Archivar órdenes cerradas</span>
                </>
              )}
            </button>
          )}
          {/* Toggle Switch */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => updateURL({ closed: null })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                !showClosedOrders
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-indigo-600'
              }`}
            >
              <BellRing size={14} /> Abiertas
            </button>
            <button
              onClick={() => updateURL({ closed: 'true' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                showClosedOrders
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-emerald-600'
              }`}
            >
              <Archive size={14} /> Archivadas
            </button>
          </div>
          <div className={`min-w-[200px] px-6 py-4 rounded-2xl border border-gray-100 shadow-sm ${
            showClosedOrders 
              ? 'bg-emerald-50 border-emerald-100' 
              : 'bg-indigo-50 border-indigo-100'
          }`}>
            {toggleLoading ? (
              <>
                <div className="h-9 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
              </>
            ) : (
              <>
                <div className={`text-3xl font-black tracking-tighter ${
                  showClosedOrders ? 'text-emerald-600' : 'text-indigo-600'
                }`}>
                  {orders.length}
                </div>
                <div className={`text-[10px] font-black uppercase tracking-widest mt-1 ${
                  showClosedOrders ? 'text-emerald-600' : 'text-indigo-600'
                }`}>
                  {showClosedOrders ? 'Órdenes Archivadas' : 'Mesas Activas'}
                </div>
              </>
            )}
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

      {toggleLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8 items-start">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden animate-pulse">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-gray-200 rounded-lg w-32"></div>
                  <div className="h-8 bg-gray-200 rounded-xl w-20"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="space-y-2 pt-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-2xl"></div>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="h-10 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8 items-start">
          {orders.map(order => (
            <OrderGroupCard 
              key={order.id} 
              order={order} 
              onCloseMesa={handleCloseMesa}
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
