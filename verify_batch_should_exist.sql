-- Script para verificar si el batch realmente debería existir

-- Información completa del batch y su orden
SELECT 
    'INFORMACIÓN COMPLETA' as tipo,
    ob.id::text as batch_id,
    ob.order_id::text,
    ob.status as batch_status,
    ob.batch_number,
    ob.created_at as batch_created_at,
    ob.archived_at as batch_archived_at,
    oa.status as order_status,
    oa.archived_at as order_archived_at,
    CASE 
        WHEN ob.created_at > oa.archived_at THEN '⚠️ Batch creado DESPUÉS de archivar la orden (ERROR)'
        ELSE 'Batch creado ANTES de archivar la orden'
    END as timeline
FROM order_batches_archive ob
INNER JOIN orders_archive oa ON ob.order_id = oa.id
WHERE ob.id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

-- Pregunta: ¿El batch fue creado después de que se archivó la orden?
-- Si es así, es un error y debería eliminarse o actualizarse

-- SOLUCIÓN RECOMENDADA:
-- Si el batch tiene status CREADO y la orden está archivada:
-- 1. El batch NO debería existir (error)
-- 2. O el batch debe quedarse en archive y mostrarse en la vista de cerradas
-- 3. O necesitamos mover la orden de vuelta a orders (no recomendado)
