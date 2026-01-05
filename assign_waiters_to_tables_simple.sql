-- Script SIMPLIFICADO para asignar waiters a las mesas
-- Asigna waiters solo a las mesas que NO tienen waiter_id asignado
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Opción 2: Solo asignar waiters a mesas que NO tienen waiter_id (más seguro)
WITH unassigned_tables AS (
  SELECT 
    t.id AS table_id,
    t.restaurant_id,
    t.table_number,
    -- Asignar waiters de forma rotativa
    (
      SELECT w.id 
      FROM waiters w 
      WHERE w.restaurant_id = t.restaurant_id 
        AND w.is_active = true
      ORDER BY w.created_at
      LIMIT 1 
      OFFSET (
        -- Distribución balanceada basada en el número de mesa
        (ROW_NUMBER() OVER (PARTITION BY t.restaurant_id ORDER BY t.table_number::int) - 1) 
        % NULLIF((SELECT COUNT(*) FROM waiters w2 WHERE w2.restaurant_id = t.restaurant_id AND w2.is_active = true), 0)
      )
    ) AS assigned_waiter_id
  FROM tables t
  WHERE t.waiter_id IS NULL  -- Solo mesas sin waiter asignado
    AND EXISTS (
      -- Solo procesar si hay waiters activos en el restaurante
      SELECT 1 
      FROM waiters w 
      WHERE w.restaurant_id = t.restaurant_id 
        AND w.is_active = true
    )
)
UPDATE tables t
SET waiter_id = uat.assigned_waiter_id
FROM unassigned_tables uat
WHERE t.id = uat.table_id
  AND uat.assigned_waiter_id IS NOT NULL;

-- Verificar resultados
SELECT 
  'Resumen de asignaciones' AS info,
  COUNT(*) FILTER (WHERE waiter_id IS NOT NULL) AS mesas_con_waiter,
  COUNT(*) FILTER (WHERE waiter_id IS NULL) AS mesas_sin_waiter,
  COUNT(*) AS total_mesas
FROM tables;

-- Ver distribución por restaurante
SELECT 
  r.name AS restaurante,
  COUNT(DISTINCT t.id) AS total_mesas,
  COUNT(DISTINCT t.waiter_id) AS mesas_con_waiter,
  COUNT(DISTINCT CASE WHEN t.waiter_id IS NULL THEN t.id END) AS mesas_sin_waiter,
  COUNT(DISTINCT w.id) AS waiters_activos
FROM tables t
LEFT JOIN restaurants r ON r.id = t.restaurant_id
LEFT JOIN waiters w ON w.restaurant_id = t.restaurant_id AND w.is_active = true
GROUP BY r.id, r.name
ORDER BY r.name;

