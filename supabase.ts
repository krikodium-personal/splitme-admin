
import { createClient } from '@supabase/supabase-js';

// Intentamos obtener las variables de entorno, con fallback a las credenciales proporcionadas
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hqaiuywzklrwywdhmqxw.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxYWl1eXd6a2xyd3l3ZGhtcXh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjI1ODksImV4cCI6MjA4MjU5ODU4OX0.H5lttp_1C0G9DwR8bk9mg-VgvdaOKubyH82Jn8MsgxY';

/**
 * Verificamos si la configuración es válida.
 * Chequeamos que no sean placeholders y tengan longitud suficiente.
 */
export const isSupabaseConfigured = 
  SUPABASE_URL.length > 10 && 
  SUPABASE_ANON_KEY.length > 10 &&
  !SUPABASE_URL.includes('placeholder') &&
  !SUPABASE_URL.includes('your-project-url');

if (!isSupabaseConfigured) {
  console.warn(
    "⚠️ CONFIGURACIÓN DE SUPABASE AUSENTE:\n" +
    "La aplicación funcionará en modo limitado hasta que se configuren las credenciales."
  );
}

// Inicialización del cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL, SUPABASE_ANON_KEY };

