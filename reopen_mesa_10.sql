-- Reabrir Mesa 10: cambiar estado para que se muestre como MESA ABIERTA
-- Ejecutar cada bloque por separado en Supabase SQL Editor

-- 1. Revertir status de la orden: CERRADO -> ABIERTO
UPDATE orders
SET status = 'ABIERTO'
WHERE id = (
  SELECT o.id FROM orders o
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number = '10'
    AND o.status = 'CERRADO'
  ORDER BY o.created_at DESC
  LIMIT 1
);

-- 2. Cambiar el ultimo batch de SERVIDO a PREPARANDO
UPDATE order_batches
SET status = 'PREPARANDO'
WHERE id = (
  SELECT ob.id FROM order_batches ob
  JOIN orders o ON o.id = ob.order_id
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number = '10'
    AND ob.status = 'SERVIDO'
  ORDER BY ob.batch_number DESC
  LIMIT 1
);

-- 3. Opcional: marcar un guest como no pagado
UPDATE order_guests
SET paid = false
WHERE id = (
  SELECT og.id FROM order_guests og
  JOIN orders o ON o.id = og.order_id
  JOIN tables t ON t.id = o.table_id
  WHERE t.table_number = '10'
    AND og.individual_amount > 0
  LIMIT 1
);
