
import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck, User, Zap } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleQuickLogin = (role: 'super' | 'resto') => {
    if (role === 'super') {
      setEmail('krikodium@gmail.com');
      setPassword('kriko1');
    } else {
      setEmail('suscripcionkriko@gmail.com');
      setPassword('kriko2');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Autenticación mediante Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo recuperar la información del usuario.");

      // 2. Obtener el perfil usando el UID (id) del usuario autenticado
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, restaurant_id')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error técnico al consultar perfiles:", profileError);
        throw new Error("Error al consultar la base de datos de perfiles.");
      }

      // 3. Validación de existencia de perfil
      if (!profile) {
        setError("Usuario autenticado, pero sin rol asignado. Contacta al soporte.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 4. Redirección basada en el rol del perfil
      if (profile.role === 'super_admin') {
        navigate('/super-admin');
      } else if (profile.role === 'restaurant_admin') {
        if (!profile.restaurant_id) {
          setError("Acceso denegado: Administrador de restaurante sin local asignado.");
          await supabase.auth.signOut();
        } else {
          navigate('/');
        }
      } else {
        await supabase.auth.signOut();
        throw new Error("Acceso denegado: El rol asignado no es administrativo.");
      }

    } catch (err: any) {
      console.error("Login catch:", err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white font-black text-3xl shadow-2xl shadow-indigo-500/20 mb-6">
            S
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter text-center">Splitme <span className="text-indigo-500">Admin</span></h1>
          <p className="text-gray-500 text-sm mt-2 font-medium tracking-tight uppercase tracking-widest text-[10px]">Gestión de Ecosistemas Gastronómicos</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restaurante.com"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:bg-white/10 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 animate-shake">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-bold leading-tight">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18}/>}
              Acceder al Panel
            </button>
          </form>

          {/* Panel de Acceso Rápido para Desarrollo */}
          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-center text-[9px] font-black uppercase text-gray-500 tracking-widest mb-4 flex items-center justify-center gap-2">
              <Zap size={10} className="text-amber-500" /> Desarrollo: Autocompletar
            </p>
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => handleQuickLogin('super')}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 p-3 rounded-xl transition-all flex flex-col items-center gap-1 group"
              >
                <ShieldCheck size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-gray-300 uppercase">Super Admin</span>
              </button>
              <button 
                type="button"
                onClick={() => handleQuickLogin('resto')}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 p-3 rounded-xl transition-all flex flex-col items-center gap-1 group"
              >
                <User size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-gray-300 uppercase">Resto Admin</span>
              </button>
            </div>
          </div>
        </div>
        
        <p className="text-center text-gray-700 text-[10px] font-black mt-10 uppercase tracking-widest">
          © 2024 Splitme Platform
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
