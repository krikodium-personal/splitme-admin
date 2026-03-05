
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';
import { 
  ArrowLeft, Users, Loader2, ShieldCheck, User, AlertCircle, Plus, Edit3, X
} from 'lucide-react';
import { Restaurant } from '../types';

interface RestaurantUser {
  id: string;
  role: string;
  restaurant_id: string | null;
  full_name?: string | null;
}

const RestaurantUsersPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [users, setUsers] = useState<RestaurantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<RestaurantUser | null>(null);
  const [editingUserDetails, setEditingUserDetails] = useState<{ email: string; full_name: string | null; role: string } | null>(null);
  const [loadingEditDetails, setLoadingEditDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRestaurant();
      fetchUsers();
    }
  }, [id]);

  useEffect(() => {
    if (!editingUser) {
      setEditingUserDetails(null);
      return;
    }
    const fetchEditDetails = async () => {
      setLoadingEditDetails(true);
      setFormError(null);
      try {
        const { data, error } = await supabase.functions.invoke('get-admin-user', {
          body: { user_id: editingUser.id },
        });
        if (error) {
          setFormError(error.message || 'Error al cargar datos.');
          setEditingUser(null);
          return;
        }
        const resp = data as { error?: string; email?: string; full_name?: string | null; role?: string };
        if (resp?.error) {
          setFormError(resp.error);
          setEditingUser(null);
          return;
        }
        setEditingUserDetails({
          email: resp.email || '',
          full_name: resp.full_name ?? null,
          role: resp.role || 'restaurant_admin',
        });
      } catch (err: any) {
        setFormError(err?.message || 'Error al cargar datos.');
        setEditingUser(null);
      } finally {
        setLoadingEditDetails(false);
      }
    };
    fetchEditDetails();
  }, [editingUser?.id]);

  const fetchRestaurant = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
    if (data) setRestaurant(data);
  };

  const fetchUsers = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, role, restaurant_id, full_name')
        .eq('restaurant_id', id)
        .order('full_name');

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim();
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;
    const full_name = (form.elements.namedItem('full_name') as HTMLInputElement)?.value?.trim();
    if (!email || !password || !id) {
      setFormError('Email y contraseña son obligatorios.');
      return;
    }
    if (password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setFormError('Sesión expirada. Cierra sesión y vuelve a iniciar sesión.');
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password, full_name: full_name || null, restaurant_id: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error || (res.status === 401 ? 'Sesión expirada. Cierra sesión y vuelve a iniciar sesión.' : `Error ${res.status}`));
        return;
      }
      if (data?.error) {
        setFormError(data.error);
        return;
      }
      setShowCreateModal(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err?.message || 'Error al crear el usuario.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    const form = e.currentTarget;
    const email = (form.elements.namedItem('edit_email') as HTMLInputElement)?.value?.trim();
    const password = (form.elements.namedItem('edit_password') as HTMLInputElement)?.value;
    const full_name = (form.elements.namedItem('edit_full_name') as HTMLInputElement)?.value?.trim();
    const role = (form.elements.namedItem('edit_role') as HTMLSelectElement)?.value;
    setSubmitting(true);
    setFormError(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        setFormError('Sesión expirada. Cierra sesión y vuelve a iniciar sesión.');
        setSubmitting(false);
        return;
      }
      const body: Record<string, unknown> = {
        user_id: editingUser.id,
        full_name: full_name || null,
        role: role || null,
      };
      if (email) body.email = email;
      if (password && password.length > 0) body.password = password;
      const { data: updateData, error: updateError } = await supabase.functions.invoke('update-admin-user', {
        body,
      });
      if (updateError) {
        setFormError(updateError.message || 'Sesión expirada.');
        return;
      }
      const data = updateData as { error?: string };
      if (data?.error) {
        setFormError(data.error);
        return;
      }
      setEditingUser(null);
      setEditingUserDetails(null);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Error al actualizar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/super-admin/restaurant/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Users size={24} />
              </div>
              Usuarios
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {restaurant?.name ? `Administradores con acceso a ${restaurant.name}` : 'Cargando...'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); setFormError(null); }}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} /> Nuevo administrador
        </button>
      </div>

      {error && (
        <div className="p-6 bg-rose-50 border-2 border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-600">
          <AlertCircle size={24} />
          <p className="font-bold">{error}</p>
          <button onClick={fetchUsers} className="ml-auto underline font-black text-xs uppercase tracking-widest">Reintentar</button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 border border-gray-100 text-center">
          <Users size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-500 font-bold">No hay usuarios asignados a este restaurante</p>
          <p className="text-sm text-gray-400 mt-2 mb-6">Crea un nuevo administrador con el botón de arriba.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700"
          >
            <Plus size={18} className="inline mr-2" /> Nuevo administrador
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center gap-4 hover:border-indigo-100 transition-colors"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                <User size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 truncate">{user.full_name || `Usuario ${user.role === 'restaurant_admin' ? 'Administrador' : user.role}`}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="text-gray-500 font-medium">ID de usuario: </span>
                  <span className="font-mono break-all">{user.id}</span>
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
                user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
              }`}>
                {user.role === 'restaurant_admin' ? 'Administrador' : user.role}
              </span>
              <button
                onClick={() => { setEditingUser(user); setFormError(null); }}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-500 hover:text-indigo-600 transition-colors"
                title="Editar"
              >
                <Edit3 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900">Nuevo administrador</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && <p className="text-sm text-rose-600 font-bold">{formError}</p>}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Email</label>
                <input name="email" type="email" required className="w-full p-3 border border-gray-200 rounded-xl font-medium" placeholder="admin@restaurante.com" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Contraseña (mín. 6 caracteres)</label>
                <input name="password" type="password" required minLength={6} className="w-full p-3 border border-gray-200 rounded-xl font-medium" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Nombre (opcional)</label>
                <input name="full_name" type="text" className="w-full p-3 border border-gray-200 rounded-xl font-medium" placeholder="Juan Pérez" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl font-black text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70">
                  {submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900">Editar usuario</h3>
              <button onClick={() => { setEditingUser(null); setEditingUserDetails(null); }} className="p-2 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
            </div>
            {loadingEditDetails ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Cargando datos...</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                {formError && <p className="text-sm text-rose-600 font-bold">{formError}</p>}
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Email</label>
                  <input name="edit_email" type="email" required defaultValue={editingUserDetails?.email ?? ''} className="w-full p-3 border border-gray-200 rounded-xl font-medium" placeholder="admin@restaurante.com" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Nueva contraseña (opcional)</label>
                  <input name="edit_password" type="password" minLength={6} className="w-full p-3 border border-gray-200 rounded-xl font-medium" placeholder="Dejar vacío para no cambiar" autoComplete="new-password" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Nombre</label>
                  <input name="edit_full_name" type="text" defaultValue={editingUserDetails?.full_name ?? editingUser.full_name ?? ''} className="w-full p-3 border border-gray-200 rounded-xl font-medium" placeholder="Juan Pérez" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase mb-1">Rol</label>
                  <select name="edit_role" className="w-full p-3 border border-gray-200 rounded-xl font-medium" defaultValue={editingUserDetails?.role ?? editingUser.role}>
                    <option value="restaurant_admin">Administrador</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setEditingUser(null); setEditingUserDetails(null); }} className="flex-1 py-3 rounded-xl font-black text-gray-600 border border-gray-200 hover:bg-gray-50">Cancelar</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70">
                    {submitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Guardar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
        <ShieldCheck size={24} className="text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-indigo-900 text-sm">Cómo agregar usuarios</p>
          <p className="text-sm text-indigo-700/80 mt-1">
            Los usuarios con rol <strong>restaurant_admin</strong> administran el restaurante. Puedes crear nuevos administradores con el botón arriba o compartir el código de acceso del restaurante.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RestaurantUsersPage;
