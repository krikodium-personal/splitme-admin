-- Script para verificar el estado de la orden y el batch

-- Verificar dónde está la orden
SELECT 
    'ÓRDEN EN ORDERS' as tipo,
    id::text,
    status,
    restaurant_id::text,
    created_at
FROM orders
WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';

SELECT 
    'ÓRDEN EN ORDERS_ARCHIVE' as tipo,
    id::text,
    status,
    restaurant_id::text,
    archived_at,
    created_at
FROM orders_archive
WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';

-- Verificar el batch
SELECT 
    'BATCH EN ORDER_BATCHES_ARCHIVE' as tipo,
    id::text,
    order_id::text,
    batch_number,
    status,
    created_at,
    archived_at
FROM order_batches_archive
WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3';

-- Conclusión
SELECT 
    'CONCLUSIÓN' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders_archive WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557')
        THEN 'La orden está archivada. El batch DEBE quedarse en order_batches_archive (aunque tenga status CREADO) porque la orden padre está archivada.'
        ELSE 'La orden NO está archivada. El batch puede moverse a order_batches.'
    END as mensaje;
