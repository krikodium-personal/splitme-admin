-- Función RPC para cerrar una orden
-- Ejecuta este SQL en el SQL Editor de Supabase para crear la función

CREATE OR REPLACE FUNCTION close_order(order_id UUID, restaurant_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Actualizar el status de la orden
  UPDATE orders
  SET status = 'Pagado'
  WHERE id = order_id
    AND restaurant_id = restaurant_id_param;
  
  -- Verificar si se actualizó
  IF FOUND THEN
    -- Obtener los datos actualizados
    SELECT row_to_json(o.*) INTO result
    FROM orders o
    WHERE o.id = order_id;
    
    RETURN result;
  ELSE
    RETURN json_build_object('error', 'No se encontró la orden o no se pudo actualizar');
  END IF;
END;
$$;

-- Dar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION close_order(UUID, UUID) TO authenticated;

