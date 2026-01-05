-- ============================================
-- Script de Migración: Archivar Órdenes Cerradas Existentes
-- ============================================
-- Este script archiva todas las órdenes que ya están cerradas (status = 'Pagado')
-- pero que aún están en las tablas activas.
--
-- ⚠️ IMPORTANTE: Ejecuta esto SOLO UNA VEZ después de crear las tablas de historial
-- ============================================

DO $$
DECLARE
  order_record RECORD;
  archived_count INTEGER := 0;
  total_orders INTEGER;
BEGIN
  -- Contar cuántas órdenes cerradas hay
  SELECT COUNT(*) INTO total_orders
  FROM orders
  WHERE status = 'Pagado';

  RAISE NOTICE 'Encontradas % órdenes cerradas para archivar', total_orders;

  -- Iterar sobre cada orden cerrada y archivarla
  FOR order_record IN 
    SELECT id, restaurant_id 
    FROM orders 
    WHERE status = 'Pagado'
    ORDER BY created_at ASC
  LOOP
    -- Llamar a la función de archivado para cada orden
    PERFORM archive_order(order_record.id, order_record.restaurant_id);
    archived_count := archived_count + 1;

    -- Log cada 100 órdenes
    IF archived_count % 100 = 0 THEN
      RAISE NOTICE 'Archivadas % de % órdenes...', archived_count, total_orders;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Migración completada: % órdenes archivadas', archived_count;
END $$;

-- Verificar resultados
SELECT 
  'Órdenes activas (abiertas)' as tipo,
  COUNT(*) as cantidad
FROM orders
WHERE status IN ('ABIERTO', 'SOLICITADO')

UNION ALL

SELECT 
  'Órdenes archivadas' as tipo,
  COUNT(*) as cantidad
FROM orders_archive;

-- Mostrar distribución por restaurante
SELECT 
  r.name as restaurante,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status IN ('ABIERTO', 'SOLICITADO')) as ordenes_activas,
  COUNT(DISTINCT oa.id) as ordenes_archivadas
FROM restaurants r
LEFT JOIN orders o ON o.restaurant_id = r.id AND o.status IN ('ABIERTO', 'SOLICITADO')
LEFT JOIN orders_archive oa ON oa.restaurant_id = r.id
GROUP BY r.id, r.name
ORDER BY r.name;

