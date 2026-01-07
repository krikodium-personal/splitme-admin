-- Función RPC para marcar un guest como pagado
-- Ejecuta este SQL en el SQL Editor de Supabase para crear la función
-- Esto evita problemas con políticas RLS (Row Level Security)

CREATE OR REPLACE FUNCTION mark_guest_as_paid(guest_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  guest_record RECORD;
BEGIN
  -- Verificar que el guest existe
  SELECT * INTO guest_record
  FROM order_guests
  WHERE id = guest_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Guest no encontrado');
  END IF;
  
  -- Actualizar el campo paid
  UPDATE order_guests
  SET paid = true
  WHERE id = guest_id;
  
  -- Verificar que se actualizó
  IF FOUND THEN
    -- Obtener los datos actualizados
    SELECT row_to_json(og.*) INTO result
    FROM order_guests og
    WHERE og.id = guest_id;
    
    RETURN result;
  ELSE
    RETURN json_build_object('error', 'No se pudo actualizar el guest');
  END IF;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION mark_guest_as_paid(UUID) TO authenticated;

-- Verificar que la función se creó correctamente
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'mark_guest_as_paid';

