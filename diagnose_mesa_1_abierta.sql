-- Diagnóstico: por qué la Mesa 1 se muestra como ABIERTA
-- Ejecutar en Supabase SQL Editor. Si tu mesa tiene otro número, cambia '1' en table_number = '1'.

-- 1) Orden de la mesa 1 (la más reciente no cerrada)
SELECT '1. ORDEN' AS bloque, o.id, o.status AS order_status, o.total_amount, t.table_number
FROM orders o
JOIN tables t ON t.id = o.table_id
WHERE t.table_number = '1' AND o.status != 'CERRADO'
ORDER BY o.created_at DESC
LIMIT 1;

-- 2) Batches: si hay alguno ENVIADO o PREPARANDO → la mesa se considera ABIERTA
SELECT '2. BATCHES' AS bloque, ob.id, ob.status AS batch_status,
  CASE WHEN ob.status IN ('ENVIADO','PREPARANDO') THEN '→ MESA ABIERTA' ELSE '' END AS efecto
FROM order_batches ob
JOIN orders o ON o.id = ob.order_id
JOIN tables t ON t.id = o.table_id
WHERE t.table_number = '1' AND o.status != 'CERRADO' AND ob.status != 'CREADO'
ORDER BY o.created_at DESC, ob.batch_number
LIMIT 20;

-- 3) Guests: si (total pagado < total orden) Y hay un guest con paid=false y individual_amount>0 → MESA ABIERTA
SELECT '3. GUESTS' AS bloque, og.name, og.individual_amount, og.paid
FROM order_guests og
JOIN orders o ON o.id = og.order_id
JOIN tables t ON t.id = o.table_id
WHERE t.table_number = '1' AND o.status != 'CERRADO'
ORDER BY o.created_at DESC, og.position;

-- 4) Resumen de totales
SELECT
  '4. RESUMEN' AS bloque,
  (SELECT o.total_amount FROM orders o JOIN tables t ON t.id=o.table_id WHERE t.table_number='1' AND o.status!='CERRADO' ORDER BY o.created_at DESC LIMIT 1) AS total_orden,
  (SELECT COALESCE(SUM(og.individual_amount),0) FROM order_guests og JOIN orders o ON o.id=og.order_id JOIN tables t ON t.id=o.table_id WHERE t.table_number='1' AND o.status!='CERRADO' AND og.paid=true) AS total_pagado_por_guests,
  (SELECT COUNT(*) FROM order_batches ob JOIN orders o ON o.id=ob.order_id JOIN tables t ON t.id=o.table_id WHERE t.table_number='1' AND o.status!='CERRADO' AND ob.status!='CREADO' AND ob.status NOT IN ('SERVIDO')) AS batches_no_servidos;
