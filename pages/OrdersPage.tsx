
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Clock, CheckCircle2, Utensils, Hash, 
  MessageSquare, Play, Check, CircleDollarSign, 
  Timer, AlertCircle, Loader2, ChevronDown, ChevronUp, BellRing, X,
  Maximize2, Minimize2, Archive, CheckCircle, Copy, Trash2, Calendar
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { CURRENT_RESTAURANT } from '../types';

type ArchivedPeriodMode = 'currentMonth' | 'month' | 'year';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const BatchCard: React.FC<{ 
  batch: any, 
  batchIndex: number,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  onRemoveOrderItem?: (orderItemId: string) => Promise<void>,
  isArchived?: boolean,
  orderGuests?: any[]
}> = ({ batch, batchIndex, onUpdateBatchStatus, onRemoveOrderItem, isArchived = false, orderGuests = [] }) => {
  const [isExpanded, setIsExpanded] = useState(batch.status !== 'SERVIDO');
  const [confirmRemoveItemId, setConfirmRemoveItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

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
        <div className="flex flex-wrap items-center gap-4">
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

            let extrasArr: string[] = [];
            if (item.extras && Array.isArray(item.extras)) extrasArr = item.extras;
            else if (typeof item.extras === 'string' && item.extras) extrasArr = item.extras.split(',').map((s: string) => s.trim()).filter(Boolean);
            else if (item.notes?.includes('EXTRAS:')) {
              const m = item.notes.match(/EXTRAS:\s*([^|]+)/);
              if (m?.[1]) extrasArr = m[1].split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            let removedArr: string[] = [];
            if (item.removed_ingredients && Array.isArray(item.removed_ingredients)) removedArr = item.removed_ingredients;
            else if (typeof item.removed_ingredients === 'string' && item.removed_ingredients) removedArr = item.removed_ingredients.split(',').map((s: string) => s.trim()).filter(Boolean);
            else if (item.notes?.includes('SIN:')) {
              const m = item.notes.match(/SIN:\s*([^|]+)/) || item.notes.match(/SIN:\s*(.+)/);
              if (m?.[1]) removedArr = m[1].split(',').map((s: string) => s.trim()).filter(Boolean);
            }

            return (
              <div key={item.id} className="flex justify-between items-start py-2 border-b border-slate-50 last:border-0">
                <div className="flex gap-3 flex-1">
                  <span className="text-xs font-black text-indigo-700 bg-indigo-50 w-6 h-6 rounded-lg flex items-center justify-center border border-indigo-100">
                    {item.quantity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-tight">
                      {itemName}
                      {item._variantReplace?.map((v: string) => (
                        <span key={v} className="text-slate-800 font-black uppercase ml-1">· {v}</span>
                      ))}
                    </p>
                    {((item._variantAdd?.length || 0) > 0 || extrasArr.length > 0 || removedArr.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {(item._variantAdd || []).map((v: string) => (
                          <span key={v} className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                            +{v}
                          </span>
                        ))}
                        {extrasArr.map((ex: string) => (
                          <span key={ex} className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                            +{ex}
                          </span>
                        ))}
                        {removedArr.map((rem: string) => (
                          <span key={rem} className="text-[9px] font-black uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100">
                            -{rem}
                          </span>
                        ))}
                      </div>
                    )}
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
                <div className="flex items-center gap-2 ml-3">
                  {batch.status === 'ENVIADO' && !isArchived && onRemoveOrderItem && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmRemoveItemId(item.id);
                      }}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Quitar del pedido"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="text-right">
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
              </div>
            );
          })}
          {/* Pagos registrados de este envío (por batch) */}
          {(batch.payments || []).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Pagos de este envío</p>
              <div className="space-y-1.5">
                {(batch.payments || []).map((p: any) => {
                  const guestName = orderGuests.find((g: any) => g.id === p.guest_id)?.name || 'Comensal';
                  const amt = Number(p.amount) || Number(p.total_amount) || 0;
                  return (
                    <div key={p.id} className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-700">{guestName}</span>
                      <span className="font-black text-emerald-600">${amt.toLocaleString('es-CL')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación para quitar producto */}
      {confirmRemoveItemId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !removingItemId && setConfirmRemoveItemId(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-base font-bold text-slate-800 mb-6">
              ¿Estás seguro de quitar el producto del pedido?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRemoveItemId(null)}
                disabled={!!removingItemId}
                className="px-4 py-2 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirmRemoveItemId || !onRemoveOrderItem) return;
                  setRemovingItemId(confirmRemoveItemId);
                  try {
                    await onRemoveOrderItem(confirmRemoveItemId);
                    setConfirmRemoveItemId(null);
                  } finally {
                    setRemovingItemId(null);
                  }
                }}
                disabled={!!removingItemId}
                className="px-4 py-2 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {removingItemId ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Quitando...
                  </>
                ) : (
                  'Sí, quitar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OrderGroupCard: React.FC<{ 
  order: any, 
  onCloseMesa: (order: any) => Promise<void>,
  onUpdateBatchStatus: (batchId: string, newStatus: string) => void,
  onRemoveOrderItem?: (orderItemId: string) => Promise<void>,
  onMarkGuestAsPaid: (guestId: string) => void,
  onMarkChargeAsPaid: (chargeId: string) => void,
  markingGuestAsPaid: string | null,
  forceExpanded?: boolean,
  isClosed?: boolean
}> = ({ order, onCloseMesa, onUpdateBatchStatus, onRemoveOrderItem, onMarkGuestAsPaid, onMarkChargeAsPaid, markingGuestAsPaid, forceExpanded = false, isClosed: propIsClosed = false }) => {
  // Inicializamos colapsado por defecto, a menos que se fuerce la expansión
  const [isCollapsed, setIsCollapsed] = useState(!forceExpanded);
  const [copiedPaymentId, setCopiedPaymentId] = useState<string | null>(null);
  // Filtrar lotes: excluir CREADO = "por enviar a cocina" (seleccionados pero NO ordenados aún)
  // Solo incluir lo que el comensal ya envió a cocina (ENVIADO, PREPARANDO, LISTO, SERVIDO)
  const batches = (order.order_batches || []).filter((batch: any) => batch.status !== 'CREADO');

  // Total de la cuenta: desde columna total_amount de orders (calculado por trigger en BD, excluye batches CREADO)
  const orderTotal = Number(order.total_amount) || 0;

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

  // Total pagado: sumar payments registrados y completar con order_guests pagados
  // que todavía no tengan payment asociado, sin duplicar comensales.
  const orderPayments = order.orderPayments || [];
  const paidGuestIdsWithPayments = new Set(
    orderPayments
      .filter((p: any) => (Number(p.amount) || Number(p.total_amount) || 0) > 0)
      .map((p: any) => p.guest_id)
      .filter(Boolean)
  );
  const totalPaidFromPayments = orderPayments.reduce((s: number, p: any) => s + (Number(p.amount) || Number(p.total_amount) || 0), 0);
  const totalPaidFromGuestsWithoutPayments = orderGuests
    .filter((g: any) => g.paid === true && !paidGuestIdsWithPayments.has(g.id))
    .reduce((sum: number, g: any) => sum + (Number(g.individual_amount) || 0), 0);
  const totalPaidAmount = totalPaidFromPayments + totalPaidFromGuestsWithoutPayments;

  const totalAmount = orderTotal;
  // Tolerancia para redondeos: al menos 1 unidad o 0.5% del total (útil en CLP y otros)
  const amountTolerance = Math.max(1, totalAmount * 0.005);
  const isTotalAmountPaid = totalAmount > 0 && Math.abs(totalPaidAmount - totalAmount) <= amountTolerance;
  const rawOutstandingAmount = totalAmount - totalPaidAmount;
  const outstandingAmount = Math.abs(rawOutstandingAmount) <= amountTolerance ? 0 : Math.max(0, rawOutstandingAmount);

  // Todos los guests con individual_amount > 0 tienen paid=TRUE (todos los que debían pagar ya pagaron)
  const allGuestsWithAmountPaid = orderGuests
    .filter((g: any) => (Number(g.individual_amount) || 0) > 0)
    .every((g: any) => g.paid === true);

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
    // Condición principal: todos los batches servidos Y el total cubierto por los pagos de los comensales
    // isTotalAmountPaid es obligatorio cuando hay monto: la suma de lo pagado por guests debe cubrir order.total_amount
    const canBePagadaOLista = allBatchesServed && (totalAmount <= 0 || isTotalAmountPaid);
    if (canBePagadaOLista) {
      if (order.status === 'Pagado') {
        isMesaPagada = true;
      } else {
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
    <div className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden flex flex-col transition-all duration-500 ease-in-out h-fit animate-in fade-in slide-in-from-bottom-4 min-w-0 w-full ${isCollapsed ? 'max-w-full' : ''}`}>
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
                  <>
                    <span className="px-3 py-0.5 bg-indigo-600 text-white rounded-lg text-xs font-medium tracking-tighter shadow-sm animate-in zoom-in-95">
                      ${orderTotal.toLocaleString('es-CL')}
                    </span>
                    {!propIsClosed && !isMesaCerrada && (
                      <span className="px-3 py-0.5 bg-red-600 text-white rounded-full text-xs font-medium tracking-tighter shadow-sm animate-in zoom-in-95">
                        ${outstandingAmount.toLocaleString('es-CL')} a saldar
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                <Timer size={10} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                <span className="mx-0.5 opacity-20">•</span>
                <Hash size={10} /> {order.id.slice(0, 6).toUpperCase()}
              </div>
              {order.tables?.waiters && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={order.tables.waiters.profile_photo_url || 'https://picsum.photos/seed/waiter/64/64'}
                    alt={order.tables.waiters.full_name}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                  />
                  <span className="text-[10px] font-bold text-slate-600">{order.tables.waiters.full_name}</span>
                </div>
              )}
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
            {!propIsClosed && !isMesaCerrada && hasBatchesCreado && (
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
                onRemoveOrderItem={onRemoveOrderItem}
                isArchived={propIsClosed}
                orderGuests={order.order_guests}
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
              <p className="text-2xl font-black text-indigo-600 tracking-tighter">${orderTotal.toLocaleString('es-CL')}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 mt-2">Diferencia a saldar</p>
              <p className={`text-xl font-black tracking-tighter ${outstandingAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ${outstandingAmount.toLocaleString('es-CL')}
              </p>
            </div>
            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">
              {batches.length} {batches.length === 1 ? 'Envío' : 'Envíos'}
            </div>
          </div>

          {/* Detalle de pagos registrados y cargos pendientes por comensal */}
          {(order.order_guests?.length > 0 || order.orderPayments?.length > 0 || order.orderGuestCharges?.length > 0) && (() => {
            const guests = order.order_guests || [];
            const payments = [...(order.orderPayments || [])]
              .filter((p: any) => (Number(p.amount) || Number(p.total_amount) || 0) > 0)
              .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            const billableCharges = [...(order.orderGuestCharges || [])]
              .filter((charge: any) => charge.status !== 'cancelled' && (Number(charge.amount) || 0) > 0)
              .sort((a: any, b: any) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            const latestCharge = [...billableCharges].sort((a: any, b: any) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )[0];
            const latestRoundId = latestCharge?.split_round_id || null;
            const latestRoundCharges = latestRoundId
              ? billableCharges.filter((charge: any) => charge.split_round_id === latestRoundId)
              : billableCharges;
            const latestRoundChargeIds = new Set(latestRoundCharges.map((charge: any) => charge.id).filter(Boolean));
            const pendingCharges = latestRoundCharges.filter((charge: any) => charge.status === 'pending');
            const paymentsToShow = propIsClosed
              ? payments
              : payments.filter((payment: any) =>
                !payment.charge_id || latestRoundChargeIds.has(payment.charge_id)
              );

            const guestById = new Map(guests.map((guest: any) => [guest.id, guest]));
            const guestsWithRegisteredPayments = new Set(paymentsToShow.map((payment: any) => payment.guest_id).filter(Boolean));
            const guestsWithPendingCharges = new Set(pendingCharges.map((charge: any) => charge.guest_id).filter(Boolean));
            const guestsWithoutRegisteredPayments = guests.filter((guest: any) =>
              (Number(guest.individual_amount) || 0) > 0 &&
              !guestsWithRegisteredPayments.has(guest.id) &&
              (guest.paid === true || !guestsWithPendingCharges.has(guest.id))
            );

            const rowsToShow = [
              ...paymentsToShow.map((payment: any, index: number) => {
                const guest = guestById.get(payment.guest_id) || null;
                const amount = Number(payment.amount) || Number(payment.total_amount) || 0;
                return {
                  id: `payment-${payment.id || index}`,
                  type: 'payment',
                  guest,
                  guestId: payment.guest_id,
                  name: guest?.name || payment.guest_name || 'Comensal',
                  amount,
                  paymentMethod: (payment.payment_method || guest?.payment_method || 'mercadopago')?.toLowerCase(),
                  paymentId: payment.payment_id || payment.external_reference || payment.mp_payment_id || payment.id || null,
                  isPaid: true,
                  canMarkPaid: false
                };
              }),
              ...pendingCharges.map((charge: any, index: number) => {
                const guest = guestById.get(charge.guest_id) || null;
                return {
                  id: `charge-${charge.id || index}`,
                  type: 'charge',
                  chargeId: charge.id,
                  guest,
                  guestId: charge.guest_id,
                  name: guest?.name || 'Comensal',
                  amount: Number(charge.amount) || 0,
                  paymentMethod: (charge.payment_method || guest?.payment_method || null)?.toLowerCase(),
                  paymentId: charge.payment_id || null,
                  isPaid: false,
                  canMarkPaid: false
                };
              }),
              ...guestsWithoutRegisteredPayments.map((guest: any) => ({
                id: `guest-${guest.id}`,
                  type: 'guest',
                  chargeId: null,
                  guest,
                  guestId: guest.id,
                name: guest.name || 'Sin nombre',
                amount: Number(guest.individual_amount) || 0,
                paymentMethod: guest.payment_method?.toLowerCase() || null,
                paymentId: guest.payment_id || null,
                isPaid: guest.paid === true,
                canMarkPaid: true
              }))
            ];
            
            return rowsToShow.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">División de Pago</p>
                <div className="space-y-2">
                  {rowsToShow.map((row: any) => {
                  const paymentMethod = row.paymentMethod || null;
                  const normalizedPaymentMethod = paymentMethod === 'transfer'
                    ? 'transferencia'
                    : paymentMethod === 'cash'
                    ? 'efectivo'
                    : paymentMethod;
                  const guestTotal = row.amount;
                  const isPaid = row.isPaid;
                  const paymentId = row.paymentId;
                  const needsManualPayment = (row.canMarkPaid || row.type === 'charge') && normalizedPaymentMethod && (
                    normalizedPaymentMethod === 'efectivo' ||
                    normalizedPaymentMethod === 'transferencia'
                  );
                  const isMercadoPago = normalizedPaymentMethod === 'mercadopago';

                  return (
                    <div 
                      key={row.id} 
                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-black text-slate-900">{row.name}</p>
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                            isPaid 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {isPaid ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                        {paymentMethod && (
                          <>
                            <p className="text-[9px] text-slate-500 font-medium">
                              Método: <span className="font-black text-slate-700 capitalize">{normalizedPaymentMethod}</span>
                            </p>
                            {isMercadoPago && isPaid && paymentId && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] text-indigo-600">ID: {paymentId}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentId);
                                    setCopiedPaymentId(paymentId);
                                    setTimeout(() => setCopiedPaymentId(null), 1500);
                                  }}
                                  className="p-0.5 rounded hover:bg-gray-100 text-indigo-600"
                                  title="Copiar ID"
                                >
                                  {copiedPaymentId === paymentId ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className={`text-lg font-black flex items-center justify-end gap-2 flex-wrap ${isPaid ? 'text-indigo-600' : 'text-red-600'}`}>
                            ${Number(guestTotal).toLocaleString('es-CL')}
                            {isPaid && <span className="text-emerald-600 font-black text-[9px] uppercase tracking-widest">PAGADO</span>}
                          </p>
                        </div>
                        {/* Mostrar botón solo para efectivo o transferencia cuando no está pagado */}
                        {needsManualPayment && (
                          !isPaid && !propIsClosed ? (
                            <button
                              onClick={() => row.type === 'charge' ? onMarkChargeAsPaid(row.chargeId) : onMarkGuestAsPaid(row.guestId)}
                              disabled={markingGuestAsPaid === (row.chargeId || row.guestId)}
                              className="px-4 py-2 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm active:scale-95 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {markingGuestAsPaid === (row.chargeId || row.guestId) ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  <span>Procesando...</span>
                                </>
                              ) : (
                                'Pago Recibido'
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
  const now = new Date();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const showClosedOrders = searchParams.get('closed') === 'true';
  const [archivedPeriodMode, setArchivedPeriodMode] = useState<ArchivedPeriodMode>('currentMonth');
  const [archivedSelectedMonth, setArchivedSelectedMonth] = useState(now.getMonth());
  const [archivedSelectedYear, setArchivedSelectedYear] = useState(now.getFullYear());
  const [archivedAvailableYears, setArchivedAvailableYears] = useState<number[]>([now.getFullYear()]);
  const [archivedAvailableMonthsByYear, setArchivedAvailableMonthsByYear] = useState<Record<number, Set<number>>>({});
  const [archivedPeriodMenuOpen, setArchivedPeriodMenuOpen] = useState(false);
  const [markingGuestAsPaid, setMarkingGuestAsPaid] = useState<string | null>(null);
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [archivingOrders, setArchivingOrders] = useState(false);
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);
  const refreshTimerRef = useRef<number | null>(null);

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

  const getArchivedPeriodRange = () => {
    const current = new Date();

    if (archivedPeriodMode === 'year') {
      return {
        start: new Date(archivedSelectedYear, 0, 1),
        end: new Date(archivedSelectedYear + 1, 0, 1)
      };
    }

    const year = archivedPeriodMode === 'currentMonth' ? current.getFullYear() : archivedSelectedYear;
    const month = archivedPeriodMode === 'currentMonth' ? current.getMonth() : archivedSelectedMonth;

    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 1)
    };
  };

  const getArchivedPeriodLabel = () => {
    if (archivedPeriodMode === 'currentMonth') return 'Mes actual';
    if (archivedPeriodMode === 'month') return `${MONTH_NAMES[archivedSelectedMonth]} ${archivedSelectedYear}`;
    return `${archivedSelectedYear}`;
  };

  const isWithinArchivedPeriod = (dateValue: string) => {
    const { start, end } = getArchivedPeriodRange();
    const date = new Date(dateValue);
    return date >= start && date < end;
  };

  const updateArchivedAvailablePeriods = (archivedOrders: any[]) => {
    const monthsByYear: Record<number, Set<number>> = {};

    archivedOrders.forEach((order: any) => {
      const date = new Date(order.created_at);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;

      monthsByYear[year] = monthsByYear[year] || new Set<number>();
      monthsByYear[year].add(month);
    });

    const years = Object.keys(monthsByYear)
      .map(Number)
      .sort((a, b) => b - a);

    setArchivedAvailableYears(years.length > 0 ? years : [new Date().getFullYear()]);
    setArchivedAvailableMonthsByYear(monthsByYear);

    if (years.length > 0 && !years.includes(archivedSelectedYear)) {
      setArchivedSelectedYear(years[0]);
    }
  };

  useEffect(() => {
    bellAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

    fetchActiveOrders();

    const refreshOpenOrders = () => {
      if (showClosedOrders) return;

      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        fetchActiveOrders();
        refreshTimerRef.current = null;
      }, 150);
    };

    const channel = supabase
      .channel(`admin-kitchen-realtime-${CURRENT_RESTAURANT?.id || 'restaurant'}-${Date.now()}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders',
        filter: CURRENT_RESTAURANT?.id ? `restaurant_id=eq.${CURRENT_RESTAURANT.id}` : undefined
      }, (payload) => {
        if (!showClosedOrders) {
          setExpandedOrderId(payload.new.id);
          refreshOpenOrders();
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'order_batches' 
      }, (payload) => {
        if (!showClosedOrders) {
          if (bellAudioRef.current && payload.new?.status !== 'CREADO') {
            bellAudioRef.current.currentTime = 0;
            bellAudioRef.current.play().catch(() => {});
          }
          setExpandedOrderId(payload.new.order_id);
          refreshOpenOrders();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'order_batches' }, () => {
        refreshOpenOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        refreshOpenOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_guest_charges' }, () => {
        refreshOpenOrders();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: CURRENT_RESTAURANT?.id ? `restaurant_id=eq.${CURRENT_RESTAURANT.id}` : undefined
      }, () => {
        refreshOpenOrders();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'order_guests'
      }, () => {
        refreshOpenOrders();
      })
      .subscribe((status) => {
        console.log('📡 Estado del canal kitchen realtime:', status);
      });

    const intervalId = window.setInterval(refreshOpenOrders, 10000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshOpenOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [showClosedOrders]);

  useEffect(() => {
    if (archivedPeriodMode !== 'month') return;

    const availableMonths = Array.from(archivedAvailableMonthsByYear[archivedSelectedYear] || []);
    if (availableMonths.length === 0 || availableMonths.includes(archivedSelectedMonth)) return;

    setArchivedSelectedMonth(Math.min(...availableMonths));
  }, [archivedPeriodMode, archivedSelectedMonth, archivedSelectedYear, archivedAvailableMonthsByYear]);

  // Refrescar órdenes cuando cambie el toggle
  useEffect(() => {
    if (!loading) {
      setToggleLoading(true);
      fetchActiveOrders().finally(() => {
        setToggleLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showClosedOrders, archivedPeriodMode, archivedSelectedMonth, archivedSelectedYear]);

  const fetchActiveOrders = async () => {
    if (!CURRENT_RESTAURANT?.id) return;
    try {
      setErrorMsg(null);

      const isMissingRpcError = (error: any) =>
        error?.code === 'PGRST202' || error?.message?.includes('Could not find the function');

      const fetchArchiveRows = async (myRpcName: string, rpcName: string, tableName: string) => {
        const { data: myRpcData, error: myRpcError } = await supabase.rpc(myRpcName);

        if (!myRpcError) {
          return myRpcData || [];
        }

        if (!isMissingRpcError(myRpcError)) {
          throw myRpcError;
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc(rpcName, {
          p_restaurant_id: CURRENT_RESTAURANT.id
        });

        if (!rpcError) {
          return rpcData || [];
        }

        if (!isMissingRpcError(rpcError)) {
          throw rpcError;
        }

        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('restaurant_id', CURRENT_RESTAURANT.id);

        if (error) throw error;
        return data || [];
      };

      let ordersData: any[] = [];
      if (showClosedOrders) {
        const archivedOrders = await fetchArchiveRows('admin_get_my_orders_archive', 'admin_get_orders_archive', 'orders_archive');
        updateArchivedAvailablePeriods(archivedOrders || []);
        ordersData = (archivedOrders || [])
          .filter((order: any) => order.created_at && isWithinArchivedPeriod(order.created_at))
          .map(order => ({ ...order, __source: 'archive' }));
      } else {
        const { data: activeOrders, error: activeOrdersError } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', CURRENT_RESTAURANT.id)
          .or('status.eq.ABIERTO,status.eq.SOLICITADO,status.eq.Pagado,status.eq.CERRADO');

        if (activeOrdersError) throw activeOrdersError;
        ordersData = (activeOrders || []).map(order => ({ ...order, __source: 'active' }));
      }

      if (!ordersData) { setOrders([]); return; }

      const orderIds = ordersData.map(order => order.id);
      const activeOrderIds = ordersData.filter(order => order.__source === 'active').map(order => order.id);
      const archivedOrderIds = ordersData.filter(order => order.__source === 'archive').map(order => order.id);

      // Obtener información de las mesas por separado (ya que no hay relación directa con orders_archive)
      const tableIds = [...new Set(ordersData.map(order => order.table_id).filter(Boolean))];
      let tablesData: any[] = [];
      if (tableIds.length > 0) {
        const { data: tables, error: tablesError } = await supabase
          .from('tables')
          .select('id, table_number, waiter_id, waiters(profile_photo_url, full_name)')
          .in('id', tableIds);
        if (tablesError) {
          console.error('Error al cargar tables:', tablesError);
        } else {
          tablesData = tables || [];
        }
      }

      // Obtener batches por separado (ya que no podemos hacer join entre tablas diferentes)
      let batchesData: any[] = [];
      if (activeOrderIds.length > 0) {
        const { data: batches, error: batchesError } = await supabase
          .from('order_batches')
          .select('*')
          .in('order_id', activeOrderIds);
        if (batchesError) {
          console.error('Error al cargar batches:', batchesError);
        } else {
          batchesData = [...batchesData, ...(batches || []).map(batch => ({ ...batch, __source: 'active' }))];
        }
      }
      if (archivedOrderIds.length > 0) {
        let archivedBatchesRpc: any[] | null = null;
        let archivedBatchesRpcError: any = null;
        const { data: myArchivedBatches, error: myArchivedBatchesError } = await supabase.rpc('admin_get_my_order_batches_archive');
        if (!myArchivedBatchesError) {
          archivedBatchesRpc = myArchivedBatches || [];
        } else if (isMissingRpcError(myArchivedBatchesError)) {
          const fallback = await supabase.rpc('admin_get_order_batches_archive', {
            p_restaurant_id: CURRENT_RESTAURANT.id
          });
          archivedBatchesRpc = fallback.data || null;
          archivedBatchesRpcError = fallback.error;
        } else {
          archivedBatchesRpcError = myArchivedBatchesError;
        }
        if (!archivedBatchesRpcError) {
          batchesData = [
            ...batchesData,
            ...(archivedBatchesRpc || [])
              .filter((batch: any) => archivedOrderIds.includes(batch.order_id))
              .map((batch: any) => ({ ...batch, __source: 'archive' }))
          ];
        } else {
          const { data: archivedBatches, error: archivedBatchesError } = await supabase
            .from('order_batches_archive')
            .select('*')
            .in('order_id', archivedOrderIds);
          if (archivedBatchesError) {
            console.error('Error al cargar archived batches:', archivedBatchesError);
          } else {
            batchesData = [...batchesData, ...(archivedBatches || []).map(batch => ({ ...batch, __source: 'archive' }))];
          }
        }
      }

      const activeBatchIds = batchesData.filter(batch => batch.__source === 'active').map(batch => batch.id);
      const archivedBatchIds = batchesData.filter(batch => batch.__source === 'archive').map(batch => batch.id);

      let itemsData: any[] = [];
      if (activeBatchIds.length > 0 || archivedBatchIds.length > 0) {
        // Obtener items sin el join con menu_items (ya que no hay relación directa con _archive)
        if (activeBatchIds.length > 0) {
          const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .in('batch_id', activeBatchIds);
          if (itemsError) throw itemsError;
          itemsData = [...itemsData, ...(items || [])];
        }
        if (archivedBatchIds.length > 0) {
          let archivedItemsRpc: any[] | null = null;
          let archivedItemsRpcError: any = null;
          const { data: myArchivedItems, error: myArchivedItemsError } = await supabase.rpc('admin_get_my_order_items_archive');
          if (!myArchivedItemsError) {
            archivedItemsRpc = myArchivedItems || [];
          } else if (isMissingRpcError(myArchivedItemsError)) {
            const fallback = await supabase.rpc('admin_get_order_items_archive', {
              p_restaurant_id: CURRENT_RESTAURANT.id
            });
            archivedItemsRpc = fallback.data || null;
            archivedItemsRpcError = fallback.error;
          } else {
            archivedItemsRpcError = myArchivedItemsError;
          }
          if (!archivedItemsRpcError) {
            itemsData = [
              ...itemsData,
              ...(archivedItemsRpc || []).filter((item: any) => archivedBatchIds.includes(item.batch_id))
            ];
          } else {
            const { data: archivedItems, error: archivedItemsError } = await supabase
              .from('order_items_archive')
              .select('*')
              .in('batch_id', archivedBatchIds);
            if (archivedItemsError) throw archivedItemsError;
            itemsData = [...itemsData, ...(archivedItems || [])];
          }
        }

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
          // Resolver variant_selections a nombres y tipo (replace=size, add=addons)
          const optionIds = [...new Set(
            itemsData.flatMap(item => {
              const vs = item.variant_selections;
              if (!vs || typeof vs !== 'object') return [];
              return Object.values(vs).filter(Boolean);
            })
          )];
          let variantOptionInfo: Record<string, { name: string; price_type: string }> = {};
          if (optionIds.length > 0) {
            const { data: opts } = await supabase
              .from('variant_options')
              .select('id, name, price_type')
              .in('id', optionIds);
            (opts || []).forEach((o: any) => { variantOptionInfo[o.id] = { name: o.name, price_type: o.price_type || 'add' }; });
          }
          itemsData = itemsData.map(item => {
            const vs = item.variant_selections;
            const replace: string[] = [];
            const add: string[] = [];
            if (vs && typeof vs === 'object') {
              Object.values(vs).forEach(optId => {
                const info = variantOptionInfo[optId];
                const name = info?.name || optId;
                if (info?.price_type === 'replace') replace.push(name);
                else add.push(name);
              });
            }
            return { ...item, _variantReplace: replace, _variantAdd: add };
          });
        }
      }

      // Obtener order_guests para cada orden
      let guestsData: any[] = [];
      if (activeOrderIds.length > 0) {
        const { data: guests, error: guestsError } = await supabase
          .from('order_guests')
          .select('*')
          .in('order_id', activeOrderIds);
        if (guestsError) {
          console.error('Error al cargar order_guests:', guestsError);
        } else {
          guestsData = [...guestsData, ...(guests || [])];
        }
      }
      if (archivedOrderIds.length > 0) {
        let archivedGuestsRpc: any[] | null = null;
        let archivedGuestsRpcError: any = null;
        const { data: myArchivedGuests, error: myArchivedGuestsError } = await supabase.rpc('admin_get_my_order_guests_archive');
        if (!myArchivedGuestsError) {
          archivedGuestsRpc = myArchivedGuests || [];
        } else if (isMissingRpcError(myArchivedGuestsError)) {
          const fallback = await supabase.rpc('admin_get_order_guests_archive', {
            p_restaurant_id: CURRENT_RESTAURANT.id
          });
          archivedGuestsRpc = fallback.data || null;
          archivedGuestsRpcError = fallback.error;
        } else {
          archivedGuestsRpcError = myArchivedGuestsError;
        }
        if (!archivedGuestsRpcError) {
          guestsData = [
            ...guestsData,
            ...(archivedGuestsRpc || []).filter((guest: any) => archivedOrderIds.includes(guest.order_id))
          ];
        } else {
          const { data: archivedGuests, error: archivedGuestsError } = await supabase
            .from('order_guests_archive')
            .select('*')
            .in('order_id', archivedOrderIds);
          if (archivedGuestsError) {
            console.error('Error al cargar order_guests_archive:', archivedGuestsError);
          } else {
            guestsData = [...guestsData, ...(archivedGuests || [])];
          }
        }
      }

      // Obtener payments para cada orden
      let paymentsData: any[] = [];
      if (activeOrderIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .in('order_id', activeOrderIds);
        if (paymentsError) throw paymentsError;
        paymentsData = [...paymentsData, ...(payments || [])];
      }
      if (archivedOrderIds.length > 0) {
        let archivedPaymentsRpc: any[] | null = null;
        let archivedPaymentsRpcError: any = null;
        const { data: myArchivedPayments, error: myArchivedPaymentsError } = await supabase.rpc('admin_get_my_payments_archive');
        if (!myArchivedPaymentsError) {
          archivedPaymentsRpc = myArchivedPayments || [];
        } else if (isMissingRpcError(myArchivedPaymentsError)) {
          const fallback = await supabase.rpc('admin_get_payments_archive', {
            p_restaurant_id: CURRENT_RESTAURANT.id
          });
          archivedPaymentsRpc = fallback.data || null;
          archivedPaymentsRpcError = fallback.error;
        } else {
          archivedPaymentsRpcError = myArchivedPaymentsError;
        }
        if (!archivedPaymentsRpcError) {
          paymentsData = [
            ...paymentsData,
            ...(archivedPaymentsRpc || []).filter((payment: any) => archivedOrderIds.includes(payment.order_id))
          ];
        } else {
          const { data: archivedPayments, error: archivedPaymentsError } = await supabase
            .from('payments_archive')
            .select('*')
            .in('order_id', archivedOrderIds);
          if (archivedPaymentsError) throw archivedPaymentsError;
          paymentsData = [...paymentsData, ...(archivedPayments || [])];
        }
      }

      // Obtener cargos de división de pago para detectar la última ronda vigente
      let chargesData: any[] = [];
      if (!showClosedOrders && orderIds.length > 0) {
        const { data: charges, error: chargesError } = await supabase
          .from('order_guest_charges')
          .select('*')
          .in('order_id', orderIds)
          .neq('status', 'cancelled');
        if (chargesError) {
          console.error('Error al cargar order_guest_charges:', chargesError);
        } else {
          chargesData = charges || [];
        }
      }

      const processedOrders = ordersData.map(order => {
        // Obtener guests y payments para esta orden (antes de orderBatches para usarlos ahí)
        const orderGuests = guestsData.filter(guest => guest.order_id === order.id);
        const orderPayments = paymentsData.filter(payment => payment.order_id === order.id);
        const orderGuestCharges = chargesData.filter(charge => charge.order_id === order.id);

        // Obtener batches para esta orden
        const orderBatches = batchesData
          .filter(batch => batch.order_id === order.id)
          .map((batch: any) => ({
            ...batch,
            order_items: itemsData.filter(item => item.batch_id === batch.id),
            payments: orderPayments.filter((p: any) => p.batch_id === batch.id)
          }))
          .sort((a: any, b: any) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        // Calcular el timestamp de la actividad más reciente (orden o último lote)
        const latestBatchTime = orderBatches.length > 0 
          ? Math.max(...orderBatches.map((b: any) => new Date(b.created_at).getTime()))
          : new Date(order.created_at).getTime();

        const lastActivity = Math.max(new Date(order.created_at).getTime(), latestBatchTime);

        // Combinar guests con sus payments
        const guestsWithPayments = orderGuests.map(guest => {
          const guestPayment = orderPayments.find(p => p.guest_id === guest.id);
          return {
            ...guest,
            payment: guestPayment || null
          };
        });

        // Obtener información de la mesa (con mesero)
        const tableInfo = tablesData.find(table => table.id === order.table_id);

        return {
          ...order,
          tables: tableInfo ? { table_number: tableInfo.table_number, waiters: tableInfo.waiters } : null,
          order_batches: orderBatches,
          order_guests: guestsWithPayments,
          orderPayments,
          orderGuestCharges,
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

  const handleRemoveOrderItem = async (orderItemId: string) => {
    if (!orderItemId) return;
    try {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', orderItemId);

      if (error) {
        console.error('Error al quitar item:', error);
        alert('Error al quitar el producto del pedido: ' + error.message);
        return;
      }
      await fetchActiveOrders();
    } catch (err: any) {
      console.error('Error al quitar item:', err);
      alert('Error al quitar el producto del pedido: ' + (err.message || 'Error desconocido'));
    }
  };

  const createManualPayment = async ({
    orderId,
    guestId,
    chargeId,
    amount,
    paymentMethod
  }: {
    orderId: string;
    guestId: string;
    chargeId?: string | null;
    amount: number;
    paymentMethod: string;
  }) => {
    const normalizedPaymentMethod = paymentMethod === 'transfer'
      ? 'transferencia'
      : paymentMethod === 'cash'
      ? 'efectivo'
      : paymentMethod;

    if (chargeId) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('charge_id', chargeId)
        .maybeSingle();

      if (existingPayment?.id) {
        return {
          id: existingPayment.id,
          paymentMethod: normalizedPaymentMethod
        };
      }
    }

    const paymentPayload: any = {
      order_id: orderId,
      guest_id: guestId,
      charge_id: chargeId || null,
      amount,
      payment_method: normalizedPaymentMethod,
      mp_transaction_id: null,
      status: 'approved'
    };

    let { data: newPayment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select('id')
      .single();

    if (paymentError && paymentError.code === 'PGRST204' && (paymentError.message?.includes('guest_id') || paymentError.message?.includes('charge_id'))) {
      const { guest_id, charge_id, ...fallbackPayload } = paymentPayload;
      const retry = await supabase
        .from('payments')
        .insert(fallbackPayload)
        .select('id')
        .single();
      newPayment = retry.data;
      paymentError = retry.error;
    }

    if (paymentError) {
      throw paymentError;
    }

    if (!newPayment?.id) {
      throw new Error('No se pudo crear el registro de pago.');
    }

    return {
      id: newPayment.id,
      paymentMethod: normalizedPaymentMethod
    };
  };

  const handleMarkGuestAsPaid = async (guestId: string) => {
    if (!guestId) {
      alert('Error: ID de guest no válido');
      return;
    }

    // Activar estado de loading
    setMarkingGuestAsPaid(guestId);

    try {
      const { data: guest, error: guestFetchError } = await supabase
        .from('order_guests')
        .select('id, order_id, individual_amount, payment_method')
        .eq('id', guestId)
        .single();

      if (guestFetchError) {
        throw guestFetchError;
      }

      const amount = Number(guest?.individual_amount) || 0;
      const paymentMethod = guest?.payment_method?.toLowerCase() || 'efectivo';
      let paymentId: string | null = null;
      let normalizedPaymentMethod = paymentMethod;

      if (amount > 0 && (paymentMethod === 'efectivo' || paymentMethod === 'transferencia' || paymentMethod === 'cash' || paymentMethod === 'transfer')) {
        const manualPayment = await createManualPayment({
          orderId: guest.order_id,
          guestId,
          chargeId: null,
          amount,
          paymentMethod
        });
        paymentId = manualPayment.id;
        normalizedPaymentMethod = manualPayment.paymentMethod;
      }

      const guestUpdatePayload: any = {
        paid: true,
        payment_method: normalizedPaymentMethod
      };

      if (paymentId) {
        guestUpdatePayload.payment_id = paymentId;
      }

      let { error } = await supabase
        .from('order_guests')
        .update(guestUpdatePayload)
        .eq('id', guestId);

      if (error && error.code === 'PGRST204' && error.message?.includes('payment_id')) {
        const { payment_id, ...fallbackPayload } = guestUpdatePayload;
        const retry = await supabase
          .from('order_guests')
          .update(fallbackPayload)
          .eq('id', guestId);
        error = retry.error;
      }

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

  const handleMarkChargeAsPaid = async (chargeId: string) => {
    if (!chargeId) {
      alert('Error: ID de cargo no válido');
      return;
    }

    setMarkingGuestAsPaid(chargeId);

    try {
      const { data: charge, error: chargeFetchError } = await supabase
        .from('order_guest_charges')
        .select('id, order_id, guest_id, amount, payment_method')
        .eq('id', chargeId)
        .single();

      if (chargeFetchError) {
        throw chargeFetchError;
      }

      const paymentMethod = charge?.payment_method?.toLowerCase() || 'efectivo';
      const manualPayment = await createManualPayment({
        orderId: charge.order_id,
        guestId: charge.guest_id,
        chargeId,
        amount: Number(charge.amount) || 0,
        paymentMethod
      });

      let { error } = await supabase
        .from('order_guest_charges')
        .update({
          status: 'paid',
          payment_method: manualPayment.paymentMethod,
          payment_id: manualPayment.id,
          paid_at: new Date().toISOString()
        })
        .eq('id', chargeId);

      if (error && error.code === 'PGRST204' && error.message?.includes('payment_id')) {
        const retry = await supabase
          .from('order_guest_charges')
          .update({
            status: 'paid',
            payment_method: manualPayment.paymentMethod,
            paid_at: new Date().toISOString()
          })
          .eq('id', chargeId);
        error = retry.error;
      }

      if (error) {
        console.error('Error al actualizar order_guest_charges:', error);
        if (error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('permission')) {
          alert(
            'Error: No tienes permisos para actualizar order_guest_charges.\n\n' +
            'Solución: Verifica las políticas RLS en Supabase para permitir UPDATE en order_guest_charges.'
          );
        } else {
          alert('Error al confirmar pago recibido: ' + error.message);
        }
        return;
      }

      const guestUpdatePayload: any = {
        paid: true,
        payment_method: manualPayment.paymentMethod,
        payment_id: manualPayment.id
      };

      let { error: guestUpdateError } = await supabase
        .from('order_guests')
        .update(guestUpdatePayload)
        .eq('id', charge.guest_id);

      if (guestUpdateError && guestUpdateError.code === 'PGRST204' && guestUpdateError.message?.includes('payment_id')) {
        const { payment_id, ...fallbackPayload } = guestUpdatePayload;
        const retry = await supabase
          .from('order_guests')
          .update(fallbackPayload)
          .eq('id', charge.guest_id);
        guestUpdateError = retry.error;
      }

      if (guestUpdateError) {
        console.warn('No se pudo sincronizar order_guests para realtime de comensales:', guestUpdateError);
      }

      await fetchActiveOrders();
    } catch (err: any) {
      console.error('Error completo al confirmar pago recibido:', err);
      alert('Error al confirmar pago recibido: ' + (err.message || 'Error desconocido'));
    } finally {
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
            const errorMsg = "⚠️ La función de archivado no está disponible. Ejecuta archive_closed_orders_function.sql en Supabase SQL Editor.";
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

  const deleteDraftBatchesForClosedOrder = async (order: any) => {
    const draftBatchIds = (order.order_batches || [])
      .filter((batch: any) => batch.status === 'CREADO')
      .map((batch: any) => batch.id)
      .filter(Boolean);

    if (draftBatchIds.length === 0) return;

    console.log('🧹 Eliminando batches CREADO antes de cerrar mesa:', {
      order_id: order.id,
      draft_batches: draftBatchIds.length
    });

    const { error: itemsDeleteError } = await supabase
      .from('order_items')
      .delete()
      .in('batch_id', draftBatchIds);

    if (itemsDeleteError) {
      throw new Error(`No se pudieron eliminar productos no enviados: ${itemsDeleteError.message}`);
    }

    const { error: batchesDeleteError } = await supabase
      .from('order_batches')
      .delete()
      .in('id', draftBatchIds)
      .eq('status', 'CREADO');

    if (batchesDeleteError) {
      throw new Error(`No se pudieron eliminar envíos no enviados: ${batchesDeleteError.message}`);
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
      console.log('🔄 Cerrando mesa - limpiando borradores y cambiando status a "CERRADO"...', order.id);

      await deleteDraftBatchesForClosedOrder(order);

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
      
      // Poner la mesa en estado Libre en la base de datos
      if (order.table_id) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'Libre' })
          .eq('id', order.table_id)
          .eq('restaurant_id', CURRENT_RESTAURANT.id);
        if (tableError) {
          console.warn('⚠️ No se pudo actualizar estado de la mesa:', tableError);
        } else {
          console.log('✅ Mesa marcada como Libre');
        }
      }
      
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
        const archiveErrorMessage = archiveError.message || 'Error desconocido';
        setErrorMsg("No se pudieron archivar las órdenes: " + archiveErrorMessage);
        
        // Si la función no existe, mostrar mensaje específico
        if (archiveError.message?.includes('function') || archiveError.message?.includes('does not exist') || archiveError.code === '42883') {
          setErrorMsg("⚠️ La función de archivado no está disponible. Ejecuta archive_closed_orders_function.sql en Supabase SQL Editor.");
        } else if (archiveErrorMessage.includes('archived_at') || archiveErrorMessage.includes('jsonb')) {
          setErrorMsg("⚠️ Supabase todavía está usando una versión vieja de la función de archivado. Ejecuta nuevamente archive_closed_orders_function.sql completo y espera unos segundos a que recargue el schema.");
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
        <div className="flex flex-wrap items-center gap-4">
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
              onClick={() => {
                setArchivedPeriodMenuOpen(false);
                updateURL({ closed: null });
              }}
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
          {showClosedOrders && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setArchivedPeriodMenuOpen(open => !open)}
                className="w-full md:w-auto bg-white border border-gray-100 shadow-sm rounded-2xl px-5 py-3 flex items-center justify-between gap-4 text-xs font-black uppercase tracking-widest text-gray-600 hover:text-emerald-600 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar size={16} className="text-emerald-600" />
                  Seleccionar período
                </span>
                <span className="flex items-center gap-2 text-emerald-600">
                  {getArchivedPeriodLabel()}
                  <ChevronDown size={16} className={`transition-transform ${archivedPeriodMenuOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {archivedPeriodMenuOpen && (
                <div className="absolute right-0 mt-3 w-full md:w-[360px] bg-white border border-gray-100 rounded-3xl shadow-xl z-20 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setArchivedPeriodMode('currentMonth');
                      setArchivedSelectedMonth(new Date().getMonth());
                      setArchivedSelectedYear(new Date().getFullYear());
                      setArchivedPeriodMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                      archivedPeriodMode === 'currentMonth'
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Mes actual
                  </button>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                    <button
                      type="button"
                      onClick={() => {
                        const availableMonths = Array.from(archivedAvailableMonthsByYear[archivedSelectedYear] || []);
                        if (availableMonths.length > 0 && !availableMonths.includes(archivedSelectedMonth)) {
                          setArchivedSelectedMonth(Math.min(...availableMonths));
                        }
                        setArchivedPeriodMode('month');
                      }}
                      className={`w-full text-left text-xs font-black uppercase tracking-widest transition-colors ${
                        archivedPeriodMode === 'month' ? 'text-emerald-600' : 'text-gray-500'
                      }`}
                    >
                      Seleccionar mes
                    </button>
                    {archivedPeriodMode === 'month' && (
                      <div className="grid grid-cols-2 gap-2">
                        {MONTH_NAMES.map((month, index) => {
                          const hasSales = archivedAvailableMonthsByYear[archivedSelectedYear]?.has(index) || false;
                          const isSelected = archivedSelectedMonth === index;

                          return (
                            <button
                              key={month}
                              type="button"
                              disabled={!hasSales}
                              onClick={() => {
                                if (!hasSales) return;
                                setArchivedSelectedMonth(index);
                                setArchivedPeriodMenuOpen(false);
                              }}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                isSelected && hasSales
                                  ? 'bg-emerald-600 text-white'
                                  : hasSales
                                    ? 'bg-white text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                                    : 'bg-white/40 text-gray-300 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {month}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                    <button
                      type="button"
                      onClick={() => setArchivedPeriodMode('year')}
                      className={`w-full text-left text-xs font-black uppercase tracking-widest transition-colors ${
                        archivedPeriodMode === 'year' ? 'text-emerald-600' : 'text-gray-500'
                      }`}
                    >
                      Seleccionar año completo
                    </button>
                    {archivedPeriodMode === 'year' && (
                      <div className="grid grid-cols-2 gap-2">
                        {archivedAvailableYears.map(year => (
                          <button
                            key={year}
                            type="button"
                            onClick={() => {
                              setArchivedSelectedYear(year);
                              setArchivedPeriodMenuOpen(false);
                            }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              archivedSelectedYear === year
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white text-gray-500 hover:text-emerald-600'
                            }`}
                          >
                            {year}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`w-full px-6 py-4 rounded-2xl border border-gray-100 shadow-sm ${
        showClosedOrders 
          ? 'bg-emerald-50 border-emerald-100' 
          : 'bg-indigo-50 border-indigo-100'
      }`}>
        {toggleLoading ? (
          <div className="flex items-center gap-4">
            <div className="h-9 w-16 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-40"></div>
          </div>
        ) : (
          <div className="flex items-end gap-3">
            <div className={`text-3xl font-black tracking-tighter leading-none ${
              showClosedOrders ? 'text-emerald-600' : 'text-indigo-600'
            }`}>
              {orders.length}
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${
              showClosedOrders ? 'text-emerald-600' : 'text-indigo-600'
            }`}>
              {showClosedOrders ? 'Órdenes Archivadas' : 'Mesas Activas'}
            </div>
          </div>
        )}
      </div>

      {errorMsg && (() => {
        const isSuccessMessage = errorMsg.startsWith('✅');
        const MessageIcon = isSuccessMessage ? CheckCircle2 : AlertCircle;
        return (
        <div className={`p-6 rounded-3xl flex items-center gap-4 border-2 ${
          isSuccessMessage
            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
            : 'bg-rose-50 border-rose-100 text-rose-600 animate-shake'
        }`}>
          <MessageIcon size={24} />
          <div className="flex-1">
            <p className="font-black text-xs uppercase tracking-widest">
              {isSuccessMessage ? 'Operación completada' : 'Atención Requerida'}
            </p>
            <p className="text-sm font-bold opacity-80">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className={`p-2 rounded-full ${isSuccessMessage ? 'hover:bg-emerald-100' : 'hover:bg-rose-100'}`}
          >
            <X size={18} />
          </button>
        </div>
        );
      })()}

      {toggleLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-md overflow-hidden animate-pulse min-w-0 w-full">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {orders.map(order => (
            <OrderGroupCard 
              key={order.id} 
              order={order} 
              onCloseMesa={handleCloseMesa}
              onUpdateBatchStatus={handleUpdateBatchStatus}
              onRemoveOrderItem={showClosedOrders ? undefined : handleRemoveOrderItem}
              onMarkGuestAsPaid={handleMarkGuestAsPaid}
              onMarkChargeAsPaid={handleMarkChargeAsPaid}
              markingGuestAsPaid={markingGuestAsPaid}
              forceExpanded={order.id === expandedOrderId}
              isClosed={showClosedOrders || order.status === 'Pagado'}
            />
          ))}
        </div>
      ) : (
        <div className="py-40 flex flex-col items-center justify-center bg-white rounded-[4rem] border border-dashed border-gray-200 text-center">
           <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
              {showClosedOrders ? <Archive size={40} /> : <Utensils size={40} />}
           </div>
           <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest">
             {showClosedOrders ? 'No hay órdenes archivadas' : 'Cocina en calma'}
           </h3>
           <p className="text-xs text-slate-400 mt-2 font-medium">
             {showClosedOrders ? 'Las órdenes aparecerán acá después de archivarlas' : 'Los pedidos aparecerán aquí automáticamente'}
           </p>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
