
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Grid, Plus, Users, User, CheckCircle2, 
  Trash2, X, AlertTriangle, Filter, Store, ChevronDown, QrCode, Download, Printer,
  Users2, AlertCircle, Loader2, List as ListIcon, LayoutGrid, Info
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { CURRENT_RESTAURANT, Table } from '../types';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';

interface Waiter {
  id: string;
  nickname: string;
  full_name: string;
  profile_photo_url?: string;
  is_active: boolean;
}

const TablesPage: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedWaiterFilter, setSelectedWaiterFilter] = useState<string>('all');
  const [selectedTableForQR, setSelectedTableForQR] = useState<Table | null>(null);
  
  const qrCardRef = useRef<HTMLDivElement>(null);

  // Formulario de creación
  const [newTableData, setNewTableData] = useState({
    number: '',
    capacity: 4,
    waiter_id: 'none'
  });

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTableForQR) {
        setSelectedTableForQR(null);
      }
    };

    if (selectedTableForQR) {
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleEscape);
      };
    }
  }, [selectedTableForQR]);

  useEffect(() => {
    fetchData();

    // Listener en tiempo real para actualizar estado de mesas cuando se crean/cierran órdenes
    if (!CURRENT_RESTAURANT?.id) {
      return;
    }

    const channel = supabase
      .channel('tables-status-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${CURRENT_RESTAURANT.id}`
      }, (payload) => {
        // Cuando se crea una orden, marcar la mesa como ocupada
        const newOrder = payload.new;
        if (newOrder.table_id && (newOrder.status === 'ABIERTO' || newOrder.status === 'SOLICITADO')) {
          setTables(prev => prev.map(table => 
            table.id === newOrder.table_id 
              ? { ...table, status: 'Ocupada' as const }
              : table
          ));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${CURRENT_RESTAURANT.id}`
      }, (payload) => {
        // Cuando se cierra una orden (status = 'Pagado'), liberar la mesa
        const updatedOrder = payload.new;
        if (updatedOrder.status === 'Pagado' && updatedOrder.table_id) {
          setTables(prev => prev.map(table => 
            table.id === updatedOrder.table_id 
              ? { ...table, status: 'Libre' as const }
              : table
          ));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [CURRENT_RESTAURANT?.id]);

  const fetchData = async () => {
    if (!isSupabaseConfigured || !CURRENT_RESTAURANT?.id) {
      if (!CURRENT_RESTAURANT?.id) setLoading(false);
      return;
    }
    try {
      setLoading(true);
      
      // Obtener mesas
      const { data: tablesData, error: tablesError } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', CURRENT_RESTAURANT.id);
      
      if (tablesError) throw tablesError;

      // Obtener órdenes abiertas para determinar qué mesas están ocupadas
      const { data: openOrders, error: ordersError } = await supabase
        .from('orders')
        .select('table_id, status')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .in('status', ['ABIERTO', 'SOLICITADO']);

      if (ordersError) {
        console.warn("Error al obtener órdenes abiertas:", ordersError);
      }

      // Crear un Set con los IDs de mesas que tienen órdenes abiertas
      const occupiedTableIds = new Set(
        (openOrders || []).map(order => order.table_id).filter(Boolean)
      );

      // Determinar qué mesas necesitan actualización en la BD
      const tablesToUpdate: { id: string; status: 'Libre' | 'Ocupada' }[] = [];
      
      const tablesWithStatus = (tablesData || []).map(table => {
        const isOccupied = occupiedTableIds.has(table.id);
        const correctStatus = isOccupied ? 'Ocupada' as const : 'Libre' as const;
        
        // Verificar si el estado original en la BD necesita actualización
        const originalStatus = table.status;
        const needsUpdate = originalStatus !== correctStatus || 
                           (originalStatus !== 'Libre' && originalStatus !== 'Ocupada');
        
        if (needsUpdate) {
          tablesToUpdate.push({ id: table.id, status: correctStatus });
        }
        
        return {
          ...table,
          status: correctStatus
        };
      });

      setTables(tablesWithStatus);

      // Actualizar todas las mesas que necesitan corrección en batch
      if (tablesToUpdate.length > 0) {
        const updatePromises = tablesToUpdate.map(({ id, status }) =>
          supabase
            .from('tables')
            .update({ status })
            .eq('id', id)
            .eq('restaurant_id', CURRENT_RESTAURANT.id)
        );
        
        const results = await Promise.all(updatePromises);
        const errors = results.filter(r => r.error);
        if (errors.length === 0) {
          console.log(`✅ Actualizadas ${tablesToUpdate.length} mesas en la base de datos`);
        } else {
          console.warn(`⚠️ Algunas mesas no se pudieron actualizar:`, errors);
        }
      }

      const { data: waitersData, error: waitersError } = await supabase
        .from('waiters')
        .select('id, nickname, full_name, profile_photo_url, is_active')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .eq('is_active', true);
      
      if (waitersError) throw waitersError;
      setWaiters(waitersData || []);

    } catch (err) {
      console.error("Error al cargar datos de mesas:", err);
    } finally {
      setLoading(false);
    }
  };

  const sortedAndFilteredTables = useMemo(() => {
    let result = [...tables];
    if (selectedWaiterFilter !== 'all') {
      if (selectedWaiterFilter === 'unassigned') {
        result = result.filter(t => t.waiter_id === null);
      } else {
        result = result.filter(t => t.waiter_id === selectedWaiterFilter);
      }
    }
    return result.sort((a, b) => 
      a.table_number.localeCompare(b.table_number, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [tables, selectedWaiterFilter]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!CURRENT_RESTAURANT?.id) return;

    if (!newTableData.number.trim()) {
      setErrorMessage("El número de mesa es obligatorio.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: existingTable } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', CURRENT_RESTAURANT.id)
        .eq('table_number', newTableData.number.trim())
        .maybeSingle();

      if (existingTable) {
        setErrorMessage(`La mesa ${newTableData.number} ya existe.`);
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('tables')
        .insert([{
          restaurant_id: CURRENT_RESTAURANT.id,
          table_number: newTableData.number.trim(),
          capacity: newTableData.capacity,
          waiter_id: newTableData.waiter_id === 'none' ? null : newTableData.waiter_id,
          status: 'Libre'
        }]);

      if (error) throw error;

      setSuccessMessage("Mesa añadida con éxito.");
      setNewTableData({ number: '', capacity: 4, waiter_id: 'none' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTable = async (id: string, number: string) => {
    if (!confirm(`¿Eliminar la mesa ${number}?`)) return;
    try {
      const { error } = await supabase.from('tables').delete().eq('id', id);
      if (error) throw error;
      setTables(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const downloadQR = async () => {
    if (!qrCardRef.current || !selectedTableForQR) return;
    setDownloading(true);
    setErrorMessage(null);
    try {
      const dataUrl = await htmlToImage.toPng(qrCardRef.current, { 
        quality: 1.0, 
        pixelRatio: 3, 
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `QR-Mesa-${selectedTableForQR.table_number}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating image", err);
      setErrorMessage("Error al generar el QR. Intente nuevamente.");
    } finally {
      setDownloading(false);
    }
  };

  const getTableUrl = (tableNumber: string) => {
    // URL de producción final para la app de comensales
    const baseUrl = "https://splitme-guests.vercel.app";
    const accessCode = CURRENT_RESTAURANT?.access_code || CURRENT_RESTAURANT?.id;
    return `${baseUrl}/?res=${accessCode}&table=${tableNumber}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Modal de QR */}
      {selectedTableForQR && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={(e) => {
            // Cerrar modal si se hace click en el fondo (no en el contenido)
            if (e.target === e.currentTarget) {
              setSelectedTableForQR(null);
            }
          }}
        >
          <div className="max-w-sm w-full animate-in zoom-in-95 duration-300">
             <div ref={qrCardRef} className="bg-white p-10 rounded-[3rem] text-center shadow-2xl">
                <div className="mb-6 flex justify-center">
                   <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-indigo-200">S</div>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{CURRENT_RESTAURANT?.name}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-8">Escanear para Pedir</p>
                
                <div className="bg-gray-50 p-6 rounded-[2.5rem] mb-8 flex items-center justify-center border-2 border-dashed border-gray-100 aspect-square overflow-hidden">
                  <QRCodeSVG 
                    value={getTableUrl(selectedTableForQR.table_number)} 
                    size={256}
                    level="H"
                    includeMargin={false}
                    className="w-full h-full"
                    imageSettings={CURRENT_RESTAURANT?.logo_url ? {
                      src: CURRENT_RESTAURANT.logo_url,
                      x: undefined,
                      y: undefined,
                      height: 48,
                      width: 48,
                      excavate: true,
                    } : undefined}
                  />
                </div>

                {/* Información adicional para acceso manual */}
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                  <p className="text-sm font-bold text-gray-700">
                    ¿Tienes problemas para escanear el QR?
                  </p>
                  <p className="text-xs text-gray-600 font-medium">
                    Ingresa manualmente a tu mesa desde <span className="font-black text-indigo-600">www.splitme.com</span>
                  </p>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Código de mesa:</span>
                      <span className="text-base font-black text-gray-900">{CURRENT_RESTAURANT?.access_code || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Número de mesa:</span>
                      <span className="text-base font-black text-gray-900">{selectedTableForQR.table_number}</span>
                    </div>
                  </div>
                </div>
             </div>

             <div className="mt-8 flex gap-4">
                <button onClick={() => setSelectedTableForQR(null)} className="flex-1 py-4 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all">Cerrar</button>
                <button 
                  onClick={downloadQR} 
                  disabled={downloading}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {downloading ? <Loader2 className="animate-spin" /> : <Download size={20} />} Descargar PNG
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Gestión de Mesas</h1>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
            <LayoutGrid size={14} className="text-indigo-600"/> 
            Distribución de salón de <span className="font-bold text-indigo-600">{CURRENT_RESTAURANT?.name || 'Cargando...'}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex">
             <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-indigo-600'}`}><LayoutGrid size={20}/></button>
             <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-400 hover:text-indigo-600'}`}><ListIcon size={20}/></button>
          </div>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Cancelar' : 'Añadir Mesa'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-indigo-50 animate-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
            <Plus className="text-indigo-600" /> Nueva Mesa
          </h2>
          <form onSubmit={handleAddTable} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Nº Mesa o Nombre *</label>
                   <input required value={newTableData.number} onChange={e => setNewTableData({...newTableData, number: e.target.value})} placeholder="Ej: 01 o VIP" className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Capacidad (Pax)</label>
                   <input type="number" value={newTableData.capacity} onChange={e => setNewTableData({...newTableData, capacity: parseInt(e.target.value)})} className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Mesero Asignado</label>
                <select value={newTableData.waiter_id} onChange={e => setNewTableData({...newTableData, waiter_id: e.target.value})} className="w-full bg-gray-50 border-transparent border-2 rounded-2xl p-4 font-bold outline-none">
                   <option value="none">Sin asignar inicialmente</option>
                   {waiters.map(w => <option key={w.id} value={w.id}>{w.nickname} ({w.full_name})</option>)}
                </select>
             </div>
             {errorMessage && <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-bold"><AlertCircle size={14}/> {errorMessage}</div>}
             {successMessage && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 text-xs font-bold"><CheckCircle2 size={14}/> {successMessage}</div>}
             <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} Confirmar y Crear
             </button>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
               <Filter size={14} className="text-gray-400" />
               <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Filtrar por Staff:</span>
            </div>
            <select 
              value={selectedWaiterFilter} 
              onChange={e => setSelectedWaiterFilter(e.target.value)}
              className="bg-transparent text-xs font-black text-indigo-600 outline-none"
            >
               <option value="all">Todos los meseros</option>
               <option value="unassigned">Sin asignar</option>
               {waiters.map(w => <option key={w.id} value={w.id}>{w.nickname}</option>)}
            </select>
         </div>
         <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
            {sortedAndFilteredTables.length} mesas encontradas
         </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {[...Array(8)].map((_, i) => <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-gray-100"></div>)}
        </div>
      ) : sortedAndFilteredTables.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-3"}>
           {sortedAndFilteredTables.map(table => {
             const assignedWaiter = table.waiter_id ? waiters.find(w => w.id === table.waiter_id) : null;
             return (
             <div key={table.id} className={`group relative bg-white rounded-[2.5rem] border-2 transition-all duration-500 overflow-hidden ${viewMode === 'grid' ? 'p-8 shadow-md hover:shadow-2xl hover:border-indigo-200 hover:scale-[1.02]' : 'p-5 flex items-center justify-between border-gray-100 hover:bg-gray-50'}`}>
                {/* Header con número de mesa */}
                <div className={`flex items-center justify-between mb-6 ${viewMode === 'list' ? 'mb-0' : ''}`}>
                   <div className={`flex items-center justify-center rounded-2xl font-black transition-all ${viewMode === 'grid' ? 'w-20 h-20 text-3xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-100' : 'w-14 h-14 text-xl bg-indigo-600 text-white'}`}>
                      {table.table_number}
                   </div>
                   {viewMode === 'grid' && (
                      <div className="flex items-center gap-2">
                         <button onClick={() => setSelectedTableForQR(table)} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"><QrCode size={18}/></button>
                         <button onClick={() => deleteTable(table.id, table.table_number)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                      </div>
                   )}
                </div>
                
                {/* Información de la mesa */}
                <div className={`space-y-4 ${viewMode === 'list' ? 'flex-1 ml-6 flex items-center gap-8' : ''}`}>
                   {/* Capacidad */}
                   <div className={`flex items-center gap-3 ${viewMode === 'list' ? '' : 'bg-gray-50 rounded-xl p-3'}`}>
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                         <Users size={18} className="text-indigo-600" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Capacidad</p>
                         <p className="text-lg font-black text-gray-900">{table.capacity} {table.capacity === 1 ? 'persona' : 'personas'}</p>
                      </div>
                   </div>

                   {/* Mesero asignado */}
                   <div className={`flex items-center gap-3 ${viewMode === 'list' ? '' : 'bg-gray-50 rounded-xl p-3'}`}>
                      {table.waiter_id && assignedWaiter ? (
                         <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            {assignedWaiter.profile_photo_url ? (
                               <img 
                                  src={assignedWaiter.profile_photo_url} 
                                  alt={assignedWaiter.nickname}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                     // Si la imagen falla, mostrar icono por defecto
                                     const parent = e.currentTarget.parentElement;
                                     if (parent) {
                                        parent.innerHTML = '<svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>';
                                     }
                                  }}
                               />
                            ) : (
                               <User size={18} className="text-emerald-600" />
                            )}
                         </div>
                      ) : (
                         <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200 flex-shrink-0">
                            <AlertTriangle size={18} className="text-amber-600" />
                         </div>
                      )}
                      <div className="flex-1">
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Mesero</p>
                         {table.waiter_id && assignedWaiter ? (
                            <p className="text-base font-bold text-gray-900">
                               {assignedWaiter.nickname || 'Staff'}
                            </p>
                         ) : (
                            <p className="text-sm font-bold text-amber-600">Sin asignar</p>
                         )}
                      </div>
                   </div>

                   {/* Estado */}
                   <div className={`flex items-center gap-3 ${viewMode === 'list' ? '' : 'bg-gray-50 rounded-xl p-3'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        table.status === 'Libre' ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                         {table.status === 'Libre' ? (
                            <CheckCircle2 size={18} className="text-emerald-600" />
                         ) : (
                            <AlertCircle size={18} className="text-red-600" />
                         )}
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Estado</p>
                         <p className={`text-base font-bold ${
                           table.status === 'Libre' ? 'text-emerald-600' : 'text-red-600'
                         }`}>
                            {table.status}
                         </p>
                      </div>
                   </div>
                </div>

                {/* Botones en modo lista */}
                {viewMode === 'list' && (
                   <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedTableForQR(table)} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><QrCode size={18}/></button>
                      <button onClick={() => deleteTable(table.id, table.table_number)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                   </div>
                )}
             </div>
             );
           })}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[3rem] border border-dashed border-gray-200 text-center">
           <Store size={48} className="text-gray-200 mb-4" />
           <p className="font-black text-gray-400 uppercase tracking-widest text-sm">No hay mesas configuradas</p>
           <button onClick={() => setShowForm(true)} className="mt-4 text-indigo-600 font-bold hover:underline">Añadir la primera mesa</button>
        </div>
      )}
    </div>
  );
};

export default TablesPage;
