-- Script para explicar la situación del batch

-- 1. Verificar dónde está la orden
SELECT 
    'ESTADO DE LA ORDEN' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557')
        THEN 'En ORDERS (tabla activa)'
        WHEN EXISTS (SELECT 1 FROM orders_archive WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557')
        THEN 'En ORDERS_ARCHIVE (tabla archivada)'
        ELSE 'No encontrada'
    END as estado;

-- 2. Verificar el batch
SELECT 
    'ESTADO DEL BATCH' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM order_batches WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3')
        THEN 'En ORDER_BATCHES (tabla activa)'
        WHEN EXISTS (SELECT 1 FROM order_batches_archive WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3')
        THEN 'En ORDER_BATCHES_ARCHIVE (tabla archivada)'
        ELSE 'No encontrado'
    END as estado,
    (SELECT status FROM order_batches_archive WHERE id = '40d8624b-0684-449a-86ef-41e20fb7fee3') as status_batch;

-- 3. CONCLUSIÓN
SELECT 
    'CONCLUSIÓN' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM orders_archive WHERE id = 'c787ed4d-7fa8-4c71-be8d-1d554b99c557')
        THEN 'La orden está ARCHIVADA. El batch DEBE quedarse en order_batches_archive porque la foreign key constraint requiere que order_id exista en orders. Si la orden está en orders_archive, el batch también debe estar en order_batches_archive, incluso si tiene status CREADO.'
        ELSE 'La orden está en orders, el batch puede moverse.'
    END as mensaje;

-- 4. SOLUCIÓN
SELECT 
    'SOLUCIÓN' as tipo,
    'El frontend ya usa batchesTable que cambia según showClosedOrders. Cuando showClosedOrders=true, consulta order_batches_archive. El batch CREADO debería mostrarse en la vista de órdenes cerradas. Si no se muestra, el problema está en la lógica del frontend que filtra batches CREADO.' as mensaje;
