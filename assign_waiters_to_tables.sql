-- Script para asignar waiters a las mesas (tables)
-- Este script distribuye los waiters activos entre las mesas de cada restaurante
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Opción 1: Asignar waiters de forma balanceada a todas las mesas (incluyendo las que ya tienen waiter)
-- Esto redistribuirá todos los waiters de forma equitativa

WITH waiter_assignments AS (
  SELECT 
    t.id AS table_id,
    t.restaurant_id,
    t.waiter_id AS current_waiter_id,
    -- Obtener waiters activos del mismo restaurante y asignar de forma rotativa
    (
      SELECT w.id 
      FROM waiters w 
      WHERE w.restaurant_id = t.restaurant_id 
        AND w.is_active = true
      ORDER BY w.created_at
      LIMIT 1 
      OFFSET (
        -- Calcular el offset basado en el número de mesa para distribución balanceada
        (ROW_NUMBER() OVER (PARTITION BY t.restaurant_id ORDER BY t.table_number::int) - 1) 
        % NULLIF((SELECT COUNT(*) FROM waiters w2 WHERE w2.restaurant_id = t.restaurant_id AND w2.is_active = true), 0)
      )
    ) AS assigned_waiter_id
  FROM tables t
  WHERE EXISTS (
    -- Solo procesar restaurantes que tengan waiters activos
    SELECT 1 
    FROM waiters w 
    WHERE w.restaurant_id = t.restaurant_id 
      AND w.is_active = true
  )
)
UPDATE tables t
SET waiter_id = wa.assigned_waiter_id
FROM waiter_assignments wa
WHERE t.id = wa.table_id
  AND wa.assigned_waiter_id IS NOT NULL;

-- Mostrar el resultado
SELECT 
  t.restaurant_id,
  r.name AS restaurant_name,
  COUNT(DISTINCT t.id) AS total_tables,
  COUNT(DISTINCT t.waiter_id) AS tables_with_waiter,
  COUNT(DISTINCT CASE WHEN t.waiter_id IS NULL THEN t.id END) AS tables_without_waiter,
  COUNT(DISTINCT w.id) AS active_waiters
FROM tables t
LEFT JOIN restaurants r ON r.id = t.restaurant_id
LEFT JOIN waiters w ON w.restaurant_id = t.restaurant_id AND w.is_active = true
GROUP BY t.restaurant_id, r.name
ORDER BY r.name;

