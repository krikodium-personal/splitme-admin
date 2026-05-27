-- RPC para que super_admin pueda actualizar perfiles (nombre, rol)
-- Ejecutar en Supabase SQL Editor

CREATE OR REPLACE FUNCTION update_profile_admin(
  p_profile_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('error', 'No autenticado');
  END IF;

  SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;
  IF v_caller_role != 'super_admin' THEN
    RETURN json_build_object('error', 'Solo super_admin puede actualizar perfiles');
  END IF;

  UPDATE profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    role = COALESCE(p_role, role)
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Perfil no encontrado');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_profile_admin(UUID, TEXT, TEXT) TO authenticated;
