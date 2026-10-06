-- Fix: al activar RLS en profiles, la policy "Super Admin ve todo"
-- hacía SELECT a profiles dentro de RLS → recursión infinita.
-- El login autenticaba bien pero fallaba al leer role/restaurant_id.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super Admin ve todo" ON public.profiles;
CREATE POLICY "Super Admin ve todo"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (private.is_super_admin())
  WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

GRANT SELECT ON public.profiles TO authenticated;
