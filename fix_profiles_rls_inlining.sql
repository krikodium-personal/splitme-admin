-- Guests: infinite recursion on profiles al entrar a una mesa.
-- Causa: is_super_admin() en LANGUAGE sql se inlinea dentro de RLS y vuelve a consultar profiles.
-- Además variant_groups/variant_options tenían RLS sin policies (el menú embebe esas tablas).

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;
