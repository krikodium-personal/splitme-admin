-- Script para habilitar Realtime en la tabla order_guests
-- Ejecuta este SQL en el SQL Editor de Supabase
-- Esto permite que los cambios en order_guests se escuchen en tiempo real

-- Paso 1: Verificar la publicación actual de realtime
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- Paso 2: Agregar order_guests a la publicación supabase_realtime
-- Esto habilita la escucha en tiempo real de cambios (INSERT, UPDATE, DELETE)
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_guests;

-- Paso 3: Verificar que order_guests fue agregada correctamente
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
    AND tablename = 'order_guests';

-- Paso 4: (Opcional) Verificar todas las tablas en realtime para confirmar
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Nota: Si necesitas remover la tabla de realtime en el futuro, usa:
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.order_guests;

