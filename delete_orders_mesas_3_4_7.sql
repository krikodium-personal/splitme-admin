-- ============================================
-- ELIMINAR ÓRDENES DE LAS MESAS 3, 4 Y 7
-- ============================================
-- Este script elimina todas las órdenes de las mesas 3, 4 y 7
-- (tablas activas y archivadas) y marca las mesas como Libre.
--
-- ⚠️ Ejecuta en el SQL Editor de Supabase
-- ⚠️ Los datos eliminados NO se pueden recuperar
-- ============================================

-- PASO 1: Ver qué órdenes se van a eliminar (solo lectura)
SELECT 
  'PREVIEW - Órdenes de Mesas 3, 4, 7 a eliminar' as paso,
  o.id,
  o.status,
  o.created_at,
  t.table_number
FROM orders o
JOIN tables t ON t.id = o.table_id
WHERE t.table_number IN ('3', '4', '7')
ORDER BY t.table_number, o.created_at;

-- Si también hay en archive:
SELECT 
  'PREVIEW - Órdenes archivadas de Mesas 3, 4, 7 a eliminar' as paso,
  oa.id,
  oa.status,
  oa.created_at,
  t.table_number
FROM orders_archive oa
JOIN tables t ON t.id = oa.table_id
WHERE t.table_number IN ('3', '4', '7')
ORDER BY t.table_number, oa.created_at;

-- ============================================
-- PASO 2: ELIMINAR (ejecutar después de verificar el preview)
-- ============================================

-- 2.1. Tablas ACTIVAS - orden por dependencias FK
DELETE FROM order_items
WHERE batch_id IN (
  SELECT ob.id FROM order_batches ob
  JOIN orders o ON o.id = ob.order_id
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM order_batches
WHERE order_id IN (
  SELECT o.id FROM orders o
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM order_guests
WHERE order_id IN (
  SELECT o.id FROM orders o
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM payments
WHERE order_id IN (
  SELECT o.id FROM orders o
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

-- Reviews y dashboard (descomenta si existen esas tablas):
-- DELETE FROM reviews WHERE order_id IN (SELECT o.id FROM orders o JOIN tables t ON t.id = o.table_id WHERE t.table_number IN ('3', '4', '7'));
-- DELETE FROM dashboard_order_events WHERE order_id IN (SELECT o.id FROM orders o JOIN tables t ON t.id = o.table_id WHERE t.table_number IN ('3', '4', '7'));

DELETE FROM orders
WHERE table_id IN (SELECT id FROM tables WHERE table_number IN ('3', '4', '7'));

-- 2.2. Tablas ARCHIVADAS
DELETE FROM order_items_archive
WHERE batch_id IN (
  SELECT ob.id FROM order_batches_archive ob
  JOIN orders_archive oa ON oa.id = ob.order_id
  JOIN tables t ON t.id = oa.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM order_batches_archive
WHERE order_id IN (
  SELECT oa.id FROM orders_archive oa
  JOIN tables t ON t.id = oa.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM order_guests_archive
WHERE order_id IN (
  SELECT oa.id FROM orders_archive oa
  JOIN tables t ON t.id = oa.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM payments_archive
WHERE order_id IN (
  SELECT oa.id FROM orders_archive oa
  JOIN tables t ON t.id = oa.table_id
  WHERE t.table_number IN ('3', '4', '7')
);

DELETE FROM orders_archive
WHERE table_id IN (SELECT id FROM tables WHERE table_number IN ('3', '4', '7'));

-- 2.3. Marcar las mesas 3, 4 y 7 como Libre
UPDATE tables
SET status = 'Libre'
WHERE table_number IN ('3', '4', '7');

-- ============================================
-- PASO 3: Verificación
-- ============================================
SELECT 
  'VERIFICACIÓN - No debe haber órdenes en mesas 3, 4, 7' as resultado,
  (SELECT COUNT(*) FROM orders o JOIN tables t ON t.id = o.table_id WHERE t.table_number IN ('3', '4', '7')) as orders_activas,
  (SELECT COUNT(*) FROM orders_archive oa JOIN tables t ON t.id = oa.table_id WHERE t.table_number IN ('3', '4', '7')) as orders_archivadas;

SELECT 
  table_number,
  status
FROM tables
WHERE table_number IN ('3', '4', '7');
