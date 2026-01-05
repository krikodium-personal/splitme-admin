-- Script para resetear todos los estados de las mesas a "Libre"
-- Ejecuta este SQL en el SQL Editor de Supabase

-- Actualizar todas las mesas a estado "Libre"
UPDATE tables
SET status = 'Libre'
WHERE status != 'Libre' OR status IS NULL;

-- Verificar el resultado
SELECT 
  status,
  COUNT(*) AS cantidad
FROM tables
GROUP BY status
ORDER BY status;

-- Mostrar resumen por restaurante
SELECT 
  r.name AS restaurante,
  COUNT(*) AS total_mesas,
  COUNT(*) FILTER (WHERE t.status = 'Libre') AS mesas_libres,
  COUNT(*) FILTER (WHERE t.status = 'Ocupada') AS mesas_ocupadas
FROM tables t
LEFT JOIN restaurants r ON r.id = t.restaurant_id
GROUP BY r.id, r.name
ORDER BY r.name;

