-- ============================================
-- Script para borrar la Mesa 3
-- ============================================
-- Ejecuta en el SQL Editor de Supabase.
-- Desvincula las órdenes de la mesa y luego borra la mesa.
-- ============================================

-- 1. Desvincular órdenes que usan la mesa 3 (table_id = NULL)
--    Las órdenes se mantienen; solo dejan de estar asociadas a una mesa.
UPDATE orders
SET table_id = NULL
WHERE table_id IN (
  SELECT id FROM tables WHERE table_number = '3'
);

-- 2. Borrar la mesa 3
DELETE FROM tables
WHERE table_number = '3';

-- 3. Verificar
SELECT table_number, COUNT(*) AS restantes
FROM tables
GROUP BY table_number
ORDER BY table_number;
