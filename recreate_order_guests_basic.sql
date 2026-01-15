-- Script para recrear order_guests básicos para las mesas 3 y 4
-- Divide el total_amount entre el guest_count

DO $$
DECLARE
    v_order_id uuid;
    v_restaurant_id uuid := '2e0110b2-5977-4cef-b987-49afddd1795d';
    v_guest_count integer;
    v_total_amount numeric;
    v_individual_amount numeric;
    v_guest_id uuid;
    v_guest_number integer;
    v_table_number text;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RECREANDO ORDER_GUESTS BÁSICOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NOTA: Estos order_guests serán aproximados';
    RAISE NOTICE '      dividiendo el total entre el número de guests';
    RAISE NOTICE '';

    -- Mesa 3
    v_order_id := 'c537e51a-6e61-4d52-82dd-64b42903f032';
    
    SELECT oa.guest_count, oa.total_amount, t.table_number
    INTO v_guest_count, v_total_amount, v_table_number
    FROM orders_archive oa
    INNER JOIN tables t ON oa.table_id = t.id
    WHERE oa.id = v_order_id;
    
    IF v_guest_count IS NULL OR v_guest_count = 0 THEN
        RAISE NOTICE '⚠️ Mesa 3: No se encontró información de la orden';
    ELSE
        RAISE NOTICE 'Mesa %: % guests, Total: $%', v_table_number, v_guest_count, v_total_amount;
        v_individual_amount := v_total_amount / v_guest_count;
        RAISE NOTICE '  Monto por guest: $%', v_individual_amount;
        
        -- Crear order_guests archivados
        FOR v_guest_number IN 1..v_guest_count LOOP
            v_guest_id := gen_random_uuid();
            
            INSERT INTO order_guests_archive (
                id,
                order_id,
                name,
                position,
                individual_amount,
                paid,
                payment_method,
                payment_id,
                created_at,
                archived_at
            )
            VALUES (
                v_guest_id,
                v_order_id,
                'Guest ' || v_guest_number,  -- Nombre genérico
                v_guest_number,  -- position
                v_individual_amount,
                true,  -- Asumimos que están pagados (la orden está cerrada)
                'efectivo',  -- Método por defecto
                NULL,
                NOW(),  -- created_at aproximado
                NOW()
            );
            
            RAISE NOTICE '  ✅ Guest % creado: % ($%)', v_guest_number, v_guest_id, v_individual_amount;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    
    -- Mesa 4
    v_order_id := 'c787ed4d-7fa8-4c71-be8d-1d554b99c557';
    
    SELECT oa.guest_count, oa.total_amount, t.table_number
    INTO v_guest_count, v_total_amount, v_table_number
    FROM orders_archive oa
    INNER JOIN tables t ON oa.table_id = t.id
    WHERE oa.id = v_order_id;
    
    IF v_guest_count IS NULL OR v_guest_count = 0 THEN
        RAISE NOTICE '⚠️ Mesa 4: No se encontró información de la orden';
    ELSE
        RAISE NOTICE 'Mesa %: % guests, Total: $%', v_table_number, v_guest_count, v_total_amount;
        v_individual_amount := v_total_amount / v_guest_count;
        RAISE NOTICE '  Monto por guest: $%', v_individual_amount;
        
        -- Crear order_guests archivados
        FOR v_guest_number IN 1..v_guest_count LOOP
            v_guest_id := gen_random_uuid();
            
            INSERT INTO order_guests_archive (
                id,
                order_id,
                name,
                position,
                individual_amount,
                paid,
                payment_method,
                payment_id,
                created_at,
                archived_at
            )
            VALUES (
                v_guest_id,
                v_order_id,
                'Guest ' || v_guest_number,  -- Nombre genérico
                v_guest_number,  -- position
                v_individual_amount,
                true,  -- Asumimos que están pagados (la orden está cerrada)
                'efectivo',  -- Método por defecto
                NULL,
                NOW(),  -- created_at aproximado
                NOW()
            );
            
            RAISE NOTICE '  ✅ Guest % creado: % ($%)', v_guest_number, v_guest_id, v_individual_amount;
        END LOOP;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PROCESO COMPLETADO';
    RAISE NOTICE '========================================';
    
END $$;

-- Verificar resultado
SELECT 
    'VERIFICACIÓN FINAL' as tipo,
    oa.id::text as order_id,
    t.table_number,
    (SELECT COUNT(*) FROM order_guests_archive og WHERE og.order_id = oa.id) as guests_archivados,
    (SELECT SUM(og.individual_amount) FROM order_guests_archive og WHERE og.order_id = oa.id) as total_guests,
    oa.total_amount as total_orden
FROM orders_archive oa
INNER JOIN tables t ON oa.table_id = t.id
WHERE oa.id IN (
    'c537e51a-6e61-4d52-82dd-64b42903f032',
    'c787ed4d-7fa8-4c71-be8d-1d554b99c557'
)
ORDER BY t.table_number;
