-- ============================================
-- Script para volver a crear la Mesa 3
-- ============================================
-- Ejecuta en el SQL Editor de Supabase.
-- Usa el primer restaurante de la tabla restaurants.
-- ============================================

INSERT INTO tables (id, restaurant_id, table_number, capacity, waiter_id, status)
SELECT gen_random_uuid(), id, '3', 4, NULL, 'Libre'
FROM restaurants
LIMIT 1;

-- Verificar
SELECT id, restaurant_id, table_number, capacity, status
FROM tables
WHERE table_number = '3';
