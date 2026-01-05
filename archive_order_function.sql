-- ============================================
-- Sistema de Archivado de Órdenes
-- ============================================
-- Este script crea las tablas de historial y la función RPC
-- para archivar órdenes cerradas automáticamente.
--
-- BENEFICIOS:
-- - Mejor rendimiento: las consultas activas solo buscan en tablas pequeñas
-- - Escalabilidad: millones de registros históricos no afectan el rendimiento
-- - Separación clara: datos activos vs históricos
-- ============================================

-- 1. Crear tablas de historial (si no existen)
-- Estas tablas tienen la misma estructura que las originales pero para datos archivados

CREATE TABLE IF NOT EXISTS orders_archive (
  LIKE orders INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS order_batches_archive (
  LIKE order_batches INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS order_items_archive (
  LIKE order_items INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS order_guests_archive (
  LIKE order_guests INCLUDING ALL
);

-- 2. Agregar columna de fecha de archivado para tracking
ALTER TABLE orders_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE order_batches_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE order_items_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE order_guests_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Crear índices para búsquedas rápidas en historial
CREATE INDEX IF NOT EXISTS idx_orders_archive_restaurant_id ON orders_archive(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_archive_created_at ON orders_archive(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_archive_archived_at ON orders_archive(archived_at);
CREATE INDEX IF NOT EXISTS idx_order_batches_archive_order_id ON order_batches_archive(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_archive_batch_id ON order_items_archive(batch_id);
CREATE INDEX IF NOT EXISTS idx_order_items_archive_order_id ON order_items_archive(order_id);

-- 4. Función RPC para archivar una orden completa
-- Esta función mueve todos los datos relacionados a las tablas de historial
-- y luego elimina los registros de las tablas activas

CREATE OR REPLACE FUNCTION archive_order(order_id UUID, restaurant_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_order_id UUID;
  archived_count INTEGER := 0;
  result JSON;
BEGIN
  -- Verificar que la orden existe y pertenece al restaurante
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = order_id 
    AND restaurant_id = restaurant_id_param
    AND status = 'Pagado'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Orden no encontrada, no está pagada, o no pertenece al restaurante'
    );
  END IF;

  -- 1. Archivar la orden principal
  INSERT INTO orders_archive
  SELECT *, NOW() as archived_at
  FROM orders
  WHERE id = order_id
  AND restaurant_id = restaurant_id_param
  RETURNING id INTO archived_order_id;

  archived_count := archived_count + 1;

  -- 2. Archivar todos los batches de la orden
  INSERT INTO order_batches_archive
  SELECT *, NOW() as archived_at
  FROM order_batches
  WHERE order_id = order_id;

  archived_count := archived_count + (SELECT COUNT(*) FROM order_batches WHERE order_id = order_id);

  -- 3. Archivar todos los items de los batches
  INSERT INTO order_items_archive
  SELECT oi.*, NOW() as archived_at
  FROM order_items oi
  INNER JOIN order_batches ob ON oi.batch_id = ob.id
  WHERE ob.order_id = order_id;

  archived_count := archived_count + (
    SELECT COUNT(*) 
    FROM order_items oi
    INNER JOIN order_batches ob ON oi.batch_id = ob.id
    WHERE ob.order_id = order_id
  );

  -- 4. Archivar todos los guests de la orden (si existe la tabla)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
    INSERT INTO order_guests_archive
    SELECT *, NOW() as archived_at
    FROM order_guests
    WHERE order_id = order_id;

    archived_count := archived_count + (SELECT COUNT(*) FROM order_guests WHERE order_id = order_id);
  END IF;

  -- 5. Eliminar los registros de las tablas activas (en orden inverso por dependencias)
  -- Primero items (dependen de batches)
  DELETE FROM order_items
  WHERE batch_id IN (SELECT id FROM order_batches WHERE order_id = order_id);

  -- Luego batches (dependen de orders)
  DELETE FROM order_batches WHERE order_id = order_id;

  -- Luego guests (si existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
    DELETE FROM order_guests WHERE order_id = order_id;
  END IF;

  -- Finalmente la orden
  DELETE FROM orders WHERE id = order_id AND restaurant_id = restaurant_id_param;

  -- Retornar resultado
  result := json_build_object(
    'success', true,
    'order_id', archived_order_id,
    'archived_records', archived_count,
    'archived_at', NOW()
  );

  RETURN result;
END;
$$;

-- 5. Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION archive_order(UUID, UUID) TO authenticated;

-- 6. (Opcional) Crear función para consultar historial
-- Esto permite acceder a datos históricos cuando sea necesario (reportes, analytics)

CREATE OR REPLACE FUNCTION get_archived_orders(
  restaurant_id_param UUID,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  order_data JSON,
  batches_data JSON,
  items_data JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_agg(DISTINCT o.*) as order_data,
    json_agg(DISTINCT ob.*) FILTER (WHERE ob.id IS NOT NULL) as batches_data,
    json_agg(DISTINCT oi.*) FILTER (WHERE oi.id IS NOT NULL) as items_data
  FROM orders_archive o
  LEFT JOIN order_batches_archive ob ON ob.order_id = o.id
  LEFT JOIN order_items_archive oi ON oi.batch_id = ob.id
  WHERE o.restaurant_id = restaurant_id_param
    AND (start_date IS NULL OR o.created_at >= start_date)
    AND (end_date IS NULL OR o.created_at <= end_date)
  GROUP BY o.id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_archived_orders(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- ============================================
-- NOTAS DE USO:
-- ============================================
-- 1. La función archive_order() se debe llamar DESPUÉS de cerrar la orden
-- 2. Se puede llamar desde el frontend o desde un trigger
-- 3. Los datos archivados se mantienen para reportes históricos
-- 4. Las consultas activas solo buscan en las tablas principales (más rápidas)
-- ============================================

