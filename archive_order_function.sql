-- ============================================
-- Sistema de Archivado de Órdenes
-- ============================================
-- Este script crea las tablas de historial y la función RPC
-- para archivar órdenes cerradas automáticamente.
--
-- ⚠️ IMPORTANTE: Ejecuta TODO este script completo en el SQL Editor de Supabase
-- No ejecutes solo partes del script, ejecuta TODO desde el inicio hasta el final
--
-- BENEFICIOS:
-- - Mejor rendimiento: las consultas activas solo buscan en tablas pequeñas
-- - Escalabilidad: millones de registros históricos no afectan el rendimiento
-- - Separación clara: datos activos vs históricos
-- ============================================

-- 1. Crear tablas de historial (si no existen)
-- Estas tablas tienen la misma estructura que las originales pero para datos archivados
-- 
-- ⚠️ IMPORTANTE: Si obtienes errores sobre columnas que no existen, significa que
-- las tablas de archivado tienen una estructura diferente a las originales.
-- En ese caso, ejecuta estas líneas para recrear las tablas (PERDERÁS datos archivados):
--
-- DROP TABLE IF EXISTS order_items_archive CASCADE;
-- DROP TABLE IF EXISTS order_batches_archive CASCADE;
-- DROP TABLE IF EXISTS order_guests_archive CASCADE;
-- DROP TABLE IF EXISTS payments_archive CASCADE;
-- DROP TABLE IF EXISTS orders_archive CASCADE;
--
-- Luego ejecuta este script completo nuevamente.

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

CREATE TABLE IF NOT EXISTS payments_archive (
  LIKE payments INCLUDING ALL
);

-- 2. Agregar columna de fecha de archivado para tracking
ALTER TABLE orders_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE order_batches_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE order_items_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE order_guests_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE payments_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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

-- ============================================
-- IMPORTANTE: Ejecuta TODO este script completo en el SQL Editor de Supabase
-- ============================================
-- Este script elimina la función antigua y crea una nueva versión corregida
-- Asegúrate de ejecutar TODO el script, no solo partes de él

-- Primero eliminar la función antigua si existe (para poder cambiar los nombres de los parámetros)
DROP FUNCTION IF EXISTS archive_order(UUID, UUID);

-- Crear la función con los nuevos nombres de parámetros (sin ambigüedad)
CREATE FUNCTION archive_order(p_order_id UUID, p_restaurant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_archived_order_id UUID;
  v_archived_count INTEGER := 0;
  v_result JSON;
BEGIN
  -- Verificar que la orden existe y pertenece al restaurante
  IF NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = p_order_id 
    AND o.restaurant_id = p_restaurant_id
    AND o.status = 'Pagado'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Orden no encontrada, no está pagada, o no pertenece al restaurante'
    );
  END IF;

  -- 1. Archivar la orden principal
  -- Insertar usando row_to_json y luego reconstruir, o mejor: insertar sin archived_at
  -- y dejar que use el valor por defecto
  -- Primero insertar todos los datos excepto archived_at
  INSERT INTO orders_archive (id, restaurant_id, table_id, guest_name, total_amount, status, created_at, guest_count)
  SELECT 
    o.id,
    o.restaurant_id,
    o.table_id,
    o.guest_name,
    o.total_amount,
    o.status,
    o.created_at,
    COALESCE(o.guest_count, 0)
  FROM orders o
  WHERE o.id = p_order_id
  AND o.restaurant_id = p_restaurant_id
  RETURNING id INTO v_archived_order_id;
  
  -- archived_at se establecerá automáticamente con el valor por defecto (NOW())

  v_archived_count := v_archived_count + 1;

  -- 2. Archivar todos los batches de la orden (EXCEPTO los que tienen status CREADO)
  -- Los batches con status CREADO no deben archivarse porque aún no han sido enviados
  -- Usar SELECT * para copiar todas las columnas, archived_at usará el valor por defecto
  INSERT INTO order_batches_archive
  SELECT ob.*
  FROM order_batches ob
  WHERE ob.order_id = p_order_id
  AND ob.status != 'CREADO';

  v_archived_count := v_archived_count + (SELECT COUNT(*) FROM order_batches ob WHERE ob.order_id = p_order_id AND ob.status != 'CREADO');

  -- 3. Archivar todos los items de los batches (solo de batches que NO son CREADO)
  -- Usar SELECT * para copiar todas las columnas que existen en ambas tablas
  -- archived_at usará el valor por defecto porque no está en order_items
  INSERT INTO order_items_archive
  SELECT oi.*
  FROM order_items oi
  INNER JOIN order_batches ob ON oi.batch_id = ob.id
  WHERE ob.order_id = p_order_id
  AND ob.status != 'CREADO';

  v_archived_count := v_archived_count + (
    SELECT COUNT(*) 
    FROM order_items oi
    INNER JOIN order_batches ob ON oi.batch_id = ob.id
    WHERE ob.order_id = p_order_id
    AND ob.status != 'CREADO'
  );

  -- 4. Archivar todos los guests de la orden (si existe la tabla)
  -- Usar SELECT * para copiar todas las columnas, archived_at usará el valor por defecto
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
    INSERT INTO order_guests_archive
    SELECT og.*
    FROM order_guests og
    WHERE og.order_id = p_order_id;

    v_archived_count := v_archived_count + (SELECT COUNT(*) FROM order_guests og WHERE og.order_id = p_order_id);
  END IF;

  -- 4.5. Archivar todos los payments de la orden (si existe la tabla payments_archive)
  -- Usar SELECT * para copiar todas las columnas, archived_at usará el valor por defecto
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_archive') THEN
    INSERT INTO payments_archive
    SELECT p.*
    FROM payments p
    WHERE p.order_id = p_order_id;

    v_archived_count := v_archived_count + (SELECT COUNT(*) FROM payments p WHERE p.order_id = p_order_id);
  END IF;

  -- 5. Eliminar los registros de las tablas activas (en orden inverso por dependencias)
  -- IMPORTANTE: NO eliminar batches con status CREADO (aún no han sido enviados)
  -- Primero items (solo de batches que NO son CREADO)
  DELETE FROM order_items oi
  WHERE oi.batch_id IN (
    SELECT ob.id 
    FROM order_batches ob 
    WHERE ob.order_id = p_order_id 
    AND ob.status != 'CREADO'
  );

  -- Luego batches (solo los que NO son CREADO)
  DELETE FROM order_batches ob 
  WHERE ob.order_id = p_order_id 
  AND ob.status != 'CREADO';

  -- Luego guests (si existe)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_guests') THEN
    DELETE FROM order_guests og WHERE og.order_id = p_order_id;
  END IF;

  -- Luego payments (si existe la tabla payments_archive, significa que también debemos eliminar de payments)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments_archive') THEN
    DELETE FROM payments p WHERE p.order_id = p_order_id;
  END IF;

  -- Finalmente la orden
  DELETE FROM orders o WHERE o.id = p_order_id AND o.restaurant_id = p_restaurant_id;

  -- Retornar resultado
  v_result := json_build_object(
    'success', true,
    'order_id', v_archived_order_id,
    'archived_records', v_archived_count,
    'archived_at', CURRENT_TIMESTAMP
  );

  RETURN v_result;
END;
$$;

-- 5. Dar permisos de ejecución
GRANT EXECUTE ON FUNCTION archive_order(UUID, UUID) TO authenticated;

-- 6. Comentario sobre los parámetros
COMMENT ON FUNCTION archive_order(UUID, UUID) IS 'Archiva una orden completa y todos sus datos relacionados. Parámetros: p_order_id (UUID), p_restaurant_id (UUID)';

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

