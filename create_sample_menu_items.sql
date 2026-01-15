-- Script para crear 20 items de menú (5 por cada subcategoría de bebidas alcohólicas)
-- Restaurant ID: 2e0110b2-5977-4cef-b987-49afddd1795d
-- Categoría: "Con alcohol" (8c7f543f-07de-401b-987c-fe13c2157314)

-- Limpiar items existentes primero (opcional - descomentar si quieres reemplazar)
-- DELETE FROM menu_items WHERE restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d' AND category_id = '8c7f543f-07de-401b-987c-fe13c2157314';

-- VINO TINTO (5 items)
-- Subcategoría: 06f2a869-6c43-4d54-9203-98f4c89b6b5d
INSERT INTO menu_items (
    id,
    restaurant_id,
    category_id,
    subcategory_id,
    name,
    description,
    price,
    image_url,
    calories,
    protein_g,
    total_fat_g,
    sat_fat_g,
    carbs_g,
    sugars_g,
    fiber_g,
    sodium_mg,
    is_featured,
    is_available,
    preparation_time_min,
    dietary_tags,
    customer_customization
) VALUES
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '06f2a869-6c43-4d54-9203-98f4c89b6b5d', 'Cabernet Sauvignon Reserva', 'Vino tinto de cuerpo medio, con notas de frutos rojos y taninos suaves. Perfecto para acompañar carnes rojas.', 12000, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=800&fit=crop', 125, 0, 0, 0, 3.8, 0.6, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '06f2a869-6c43-4d54-9203-98f4c89b6b5d', 'Carménère Gran Reserva', 'Vino tinto emblemático de Chile, de cuerpo completo con notas de especias y chocolate. Ideal para acompañar platos de cordero.', 18000, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 125, 0, 0, 0, 3.8, 0.6, 0, 5, true, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '06f2a869-6c43-4d54-9203-98f4c89b6b5d', 'Malbec Argentino', 'Vino tinto intenso con aromas a ciruela y especias. Maridaje perfecto con asados y parrillas.', 15000, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=800&fit=crop', 125, 0, 0, 0, 3.8, 0.6, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '06f2a869-6c43-4d54-9203-98f4c89b6b5d', 'Merlot Cosecha', 'Vino tinto suave y elegante, con notas de frutos rojos maduros. Versátil para acompañar diferentes platillos.', 10000, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 125, 0, 0, 0, 3.8, 0.6, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '06f2a869-6c43-4d54-9203-98f4c89b6b5d', 'Pinot Noir', 'Vino tinto delicado y aromático, con notas de cereza y especias suaves. Excelente con pescados y carnes blancas.', 14000, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&h=800&fit=crop', 125, 0, 0, 0, 3.8, 0.6, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),

-- CERVEZAS (5 items)
-- Subcategoría: 0868073b-0bbe-4179-9067-a3f3c87fb4e5
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '0868073b-0bbe-4179-9067-a3f3c87fb4e5', 'Cerveza Lager 330ml', 'Cerveza rubia refrescante, perfecta para cualquier momento. Servida fría en botella de 330ml.', 3500, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=800&fit=crop', 150, 1.5, 0, 0, 12, 0, 0, 10, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '0868073b-0bbe-4179-9067-a3f3c87fb4e5', 'Cerveza IPA Artesanal', 'Cerveza artesanal con notas de lúpulo intensas y amargor balanceado. Para los amantes de las cervezas con carácter.', 5500, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=800&fit=crop', 180, 1.8, 0, 0, 15, 0, 0, 15, true, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '0868073b-0bbe-4179-9067-a3f3c87fb4e5', 'Cerveza Stout 500ml', 'Cerveza oscura con sabor robusto a café y chocolate. Cuerpo completo y cremosa espuma.', 4800, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=800&fit=crop', 200, 2, 0, 0, 18, 0, 0, 20, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '0868073b-0bbe-4179-9067-a3f3c87fb4e5', 'Cerveza Pilsen', 'Cerveza rubia clásica, ligera y refrescante. La opción perfecta para acompañar cualquier comida.', 3200, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=800&fit=crop', 145, 1.3, 0, 0, 11, 0, 0, 8, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', '0868073b-0bbe-4179-9067-a3f3c87fb4e5', 'Cerveza Wheat Beer', 'Cerveza de trigo suave y especiada, con notas cítricas y de clavo. Perfecta para el verano.', 5200, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&h=800&fit=crop', 160, 1.6, 0, 0, 13, 0, 0, 12, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),

-- VINO BLANCO (5 items)
-- Subcategoría: f740c33b-0944-46b7-92dd-683b96f0fff7
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f740c33b-0944-46b7-92dd-683b96f0fff7', 'Chardonnay Reserva', 'Vino blanco con cuerpo, con notas de manzana y vainilla. Ideal para acompañar mariscos y pescados.', 11000, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 121, 0, 0, 0, 3.7, 0.5, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f740c33b-0944-46b7-92dd-683b96f0fff7', 'Sauvignon Blanc', 'Vino blanco fresco y aromático, con notas cítricas y herbáceas. Perfecto para aperitivos y ensaladas.', 9500, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 121, 0, 0, 0, 3.7, 0.5, 0, 5, true, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f740c33b-0944-46b7-92dd-683b96f0fff7', 'Riesling Semiseco', 'Vino blanco semiseco con notas florales y frutales. Versátil para diferentes tipos de comida.', 10500, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 121, 0, 0, 0, 3.7, 0.5, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f740c33b-0944-46b7-92dd-683b96f0fff7', 'Viognier', 'Vino blanco exótico con aromas de flores blancas y frutas tropicales. Elegante y complejo.', 13000, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 121, 0, 0, 0, 3.7, 0.5, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f740c33b-0944-46b7-92dd-683b96f0fff7', 'Pinot Grigio', 'Vino blanco ligero y fresco, con notas de pera y limón. Refrescante y fácil de beber.', 8800, 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800&h=800&fit=crop', 121, 0, 0, 0, 3.7, 0.5, 0, 5, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),

-- TRAGOS (5 items)
-- Subcategoría: f0bb6819-2b37-465d-aa0f-7ea19d5342b6
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f0bb6819-2b37-465d-aa0f-7ea19d5342b6', 'Pisco Sour', 'Cóctel emblemático chileno/peruano. Pisco, limón, azúcar y clara de huevo. Preparado al momento.', 6500, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=800&fit=crop', 180, 1, 0, 0, 15, 12, 0, 5, true, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f0bb6819-2b37-465d-aa0f-7ea19d5342b6', 'Mojito Cubano', 'Clásico cóctel refrescante con ron, menta, limón y soda. Perfecto para el verano.', 5500, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=800&fit=crop', 160, 0.5, 0, 0, 12, 10, 0, 5, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f0bb6819-2b37-465d-aa0f-7ea19d5342b6', 'Caipirinha', 'Cóctel brasileño con cachaça, limón y azúcar. Dulce, ácido y refrescante.', 6000, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=800&fit=crop', 170, 0.5, 0, 0, 14, 11, 0, 5, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f0bb6819-2b37-465d-aa0f-7ea19d5342b6', 'Margarita', 'Cóctel mexicano con tequila, triple sec y jugo de limón. Servido con sal en el borde.', 6200, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=800&fit=crop', 175, 0.5, 0, 0, 13, 11, 0, 5, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb),
(gen_random_uuid(), '2e0110b2-5977-4cef-b987-49afddd1795d', '8c7f543f-07de-401b-987c-fe13c2157314', 'f0bb6819-2b37-465d-aa0f-7ea19d5342b6', 'Piña Colada', 'Cóctel tropical con ron, crema de coco y jugo de piña. Dulce y cremoso, servido con hielo.', 6800, 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800&h=800&fit=crop', 250, 1.5, 8, 7, 22, 18, 1, 8, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb);

-- Verificación
SELECT 
    'ITEMS CREADOS POR SUBCATEGORÍA' as tipo,
    c.name as subcategoria,
    COUNT(*) as cantidad
FROM menu_items mi
INNER JOIN categories c ON mi.subcategory_id = c.id
WHERE mi.restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
AND mi.category_id = '8c7f543f-07de-401b-987c-fe13c2157314'
GROUP BY c.id, c.name
ORDER BY c.name;

-- Mostrar todos los items creados
SELECT 
    'ITEMS CREADOS' as tipo,
    mi.name,
    c.name as subcategoria,
    mi.price,
    mi.is_featured,
    mi.is_available
FROM menu_items mi
INNER JOIN categories c ON mi.subcategory_id = c.id
WHERE mi.restaurant_id = '2e0110b2-5977-4cef-b987-49afddd1795d'
AND mi.category_id = '8c7f543f-07de-401b-987c-fe13c2157314'
ORDER BY c.name, mi.name;
