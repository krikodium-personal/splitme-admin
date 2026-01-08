-- Script de diagnóstico: Verificar columnas de orders
SELECT 
    column_name,
    data_type,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

