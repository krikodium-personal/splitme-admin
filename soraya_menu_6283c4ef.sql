-- Menú completo Restaurante Soraya
-- Restaurant ID: 6283c4ef-910a-403b-8759-3e75e1798c51
-- Basado en PDF soraya_qr.pdf

-- Eliminar datos previos (descomentar si quieres reemplazar)
-- DELETE FROM menu_items WHERE restaurant_id = '6283c4ef-910a-403b-8759-3e75e1798c51';
-- DELETE FROM categories WHERE restaurant_id = '6283c4ef-910a-403b-8759-3e75e1798c51';

-- ========== CATEGORÍAS ==========
INSERT INTO categories (id, restaurant_id, name, parent_id, sort_order) VALUES
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'CAFETERÍA', NULL, 1),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'FACTURAS Y TOSTADAS', NULL, 2),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'TORTAS', NULL, 3),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'BEBIDAS', NULL, 4),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'SANDWICHERÍA', NULL, 5),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'CERVEZAS Y SIDRAS', NULL, 6),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'APERITIVOS Y WHISKY', NULL, 7),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'VINOS', NULL, 8),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'PIZZAS', NULL, 9),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'EMPANADAS', NULL, 10),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'TARTAS', NULL, 11),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'PLATOS Y ENSALADAS', NULL, 12),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'PESCADOS', NULL, 13),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'TORTILLAS Y OMELETTES', NULL, 14),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'PARRILLA', NULL, 15),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'PASTAS CASERAS', NULL, 16),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'MILANESAS Y SUPREMAS', NULL, 17),
(gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', 'POSTRES Y HELADOS', NULL, 18);

-- ========== PLATOS - Usando subquery para obtener category_id por nombre ==========
-- Helper: c.id = (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='NOMBRE' LIMIT 1)

-- CAFETERÍA
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='CAFETERÍA' LIMIT 1) c
CROSS JOIN (VALUES
  ('CAFÉ CON LECHE EN TAZA DE CAMPO', 'Con 3 medialunas o facturas.', 5600),
  ('CAFÉ CON LECHE EXPRESS', '', 6700),
  ('CAPUCHINO A LA ITALIANA', '', 5600),
  ('SUBMARINO 2 BARRITAS', '', 4500),
  ('CAFÉ AMERICANO CON CREMA', '', 4000),
  ('CAFÉ AMERICANO', '', 3400),
  ('CAFÉ DOBLE CON CREMA', '', 5800),
  ('CAFÉ DOBLE', '', 4500),
  ('CAFÉ CON CREMA', '', 3700),
  ('CAFÉ', '', 2600),
  ('CAPUCHINO TRICOLOR', '', 4500),
  ('TÉ CON LECHE', '', 3500),
  ('TÉ MEDICINAL', '', 3500),
  ('TÉ', '', 2600),
  ('TÉ SABORIZADO', '', 3500),
  ('VIENÉS', 'Café frío, helado de vainilla, crema chantilli y canela.', 8600),
  ('MAZAGRÁN', 'Café, Rhum y rodajas de limón.', 8600),
  ('CALYPSO', 'Café, Tía María, crema, canela.', 8600),
  ('IRLANDÉS', 'Café, whisky, crema, canela, chocolate.', 8600),
  ('SUIZO', 'Café, Cointreau, crema, canela.', 8600)
) AS v(n, d, p);

-- FACTURAS Y TOSTADAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='FACTURAS Y TOSTADAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('CAFÉ CON LECHE EN TAZA DE CAMPO', 'Con tostadas, queso crema y mermelada.', 8200),
  ('CAFÉ CON LECHE EXPRESS', 'Con tostadas, queso crema y mermelada.', 6700),
  ('TÉ CON LECHE', '', 6700),
  ('TOSTADA DE PALTA, HUEVO Y QUESO', '', 9400),
  ('CREMA + VASO DE GRANOLA + YOGURT Y ENSALADA DE FRUTAS', '', 7600),
  ('YOGURT CON GRANOLA', '', 7600),
  ('TOSTADAS DE PAN FRANCÉS', '', 4800),
  ('MEDIALUNAS / FACTURAS', 'Elaboración propia', 1500)
) AS v(n, d, p);

-- TORTAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='TORTAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('LEMON PIE', 'Caseras', 9200),
  ('CHEESE CAKE', 'Caseras', 9200),
  ('MOUSSE DE CHOCOLATE', 'Caseras', 9200),
  ('SELVA NEGRA', 'Caseras', 9200),
  ('MANZANA', 'Caseras', 9200),
  ('RICOTTA', 'Caseras', 9200),
  ('POSTRE BALCARCE', 'Caseras', 9200)
) AS v(n, d, p);

-- BEBIDAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='BEBIDAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('AGUA SABORIZADA', '', 4200),
  ('AGUA MINERAL', '', 3900),
  ('GASEOSAS', '', 3900),
  ('LICUADOS CON AGUA', 'Banana - Manzana - Durazno - Frutilla - Ananá', 5900),
  ('LICUADOS CON LECHE', 'Banana - Manzana - Durazno - Frutilla - Ananá', 6300),
  ('EXPRIMIDO NATURAL DE LIMÓN', '(limonada)', 5500),
  ('EXPRIMIDO NATURAL DE NARANJA', '', 5900)
) AS v(n, d, p);

-- SANDWICHERÍA
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 15, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='SANDWICHERÍA' LIMIT 1) c
CROSS JOIN (VALUES
  ('TOSTADO MIXTO', 'En pan francés, figazza árabe casera o miga', 7300),
  ('JAMÓN CRUDO Y QUESO', 'En pan francés, figazza árabe casera o miga', 7300),
  ('JAMÓN COCIDO Y QUESO', 'En pan francés, figazza árabe casera o miga', 6300),
  ('MEDIALUNA CON JAMÓN Y QUESO', 'Unidad', 4400),
  ('MEDIALUNA DE CRUDO Y QUESO', 'Unidad', 4800),
  ('PECHUGUITA DE POLLO GRILLÉ', 'Con papas fritas. Con lechuga, tomate, jamón y queso', 14300),
  ('HAMBURGUESA CASERA', 'Con papas fritas', 13400),
  ('MILANESA', 'Con papas fritas', 14200)
) AS v(n, d, p);

-- CERVEZAS Y SIDRAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='CERVEZAS Y SIDRAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('HEINEKEN LATA 473 CC', '', 6800),
  ('IMPERIAL LATA 473 CC', '', 6800),
  ('SCHNEIDER LATA 473 CC', '', 6800),
  ('PINTA DE CERVEZA TIRADA', '', 5400),
  ('JARRA DE 1 LT CERVEZA TIRADA', '', 13800),
  ('PINTA DE SIDRA TIRADA', '', 5400),
  ('SIDRA NACIONAL', '', 8600),
  ('CHAMPAGNE CHANDON EXTRA BRUT', '', 20700),
  ('CHAMPAGNE LÓPEZ', '', 24000)
) AS v(n, d, p);

-- APERITIVOS Y WHISKY
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='APERITIVOS Y WHISKY' LIMIT 1) c
CROSS JOIN (VALUES
  ('APEROL', '', 9800),
  ('POMELO SCHWEPPES CON PUNT E MES', '', 9800),
  ('GIN TONIC', '', 9800),
  ('CAMPARI CON EXPRIMIDO DE NARANJA', '', 9800),
  ('FERNET CON COCA COLA', '', 7500),
  ('JOHNNY WALKER RED LABEL', '', 10900)
) AS v(n, d, p);

-- VINOS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 0, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='VINOS' LIMIT 1) c
CROSS JOIN (VALUES
  ('NICASIA VIOGNIER', '750 CC', 16600),
  ('ÁLAMOS CHARDONNAY', '750 CC', 18700),
  ('SAN HUBERTO BLANCO', '750 CC / 350 CC', 10200),
  ('COPA DE VINO BLANCO DE LA CASA', '', 5200),
  ('TRUMPETER MALBEC', '750 CC', 19400),
  ('NICASIA MALBEC', '750 CC', 16500),
  ('ÁLAMOS MALBEC', '750 CC', 18700),
  ('ESTIBA MALBEC', '750 CC', 18600),
  ('SAN HUBERTO TINTO', '750 CC / 350 CC', 10200),
  ('COPA DE VINO TINTO DE LA CASA', '', 5200)
) AS v(n, d, p);

-- PIZZAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 25, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='PIZZAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('MUZZARELLA', 'Salsa de tomate, muzzarella, aceitunas y orégano.', 26200),
  ('MARGARITA', 'Salsa de tomate, muzzarella, aceitunas y albahaca.', 26200),
  ('JAMÓN Y MUZZARELLA', 'Salsa de tomate, muzzarella, jamón, provolone, aceitunas y orégano.', 26200),
  ('RÚCULA', 'Salsa de tomate, muzzarella, aceitunas y rúcula.', 26200),
  ('ANCHOAS', 'Salsa de tomate, muzzarella, anchoas, aceitunas y albahaca.', 27200),
  ('JAMÓN Y MORRONES', 'Salsa de tomate, muzzarella, jamón, morrones, aceitunas y orégano.', 27500),
  ('ESPINACA CON SALSA BLANCA', 'Salsa de tomate, espinaca, salsa blanca, lluvia de huevo duro y provolone.', 26800),
  ('NAPOLITANA', 'Salsa de tomate, muzzarella, rodajas de tomate natural, aceite de oliva, ajo, perejil y orégano.', 28500),
  ('PALMITOS', 'Salsa de tomate, muzzarella, palmitos, jamón, morrones, huevo duro, aceitunas y salsa golf.', 28500),
  ('PROVOLONE', 'Salsa de tomate, muzzarella, jamón, provolone, aceitunas y orégano.', 28500),
  ('CALABRESA', 'Salsa de tomate, muzzarella, morrones, longaniza calabresa, aceitunas, ají molido y orégano.', 27200),
  ('FUGAZZETTA', 'Muzzarella, cebolla, aceite de oliva, orégano y provolone.', 27200),
  ('CARIBEÑA', 'Salsa de tomate, muzzarella, jamón, ananá, morrones y aceitunas.', 28700),
  ('CUATRO QUESOS', 'Salsa de tomate, muzzarella, roquefort, provolone, cremoso y orégano.', 27900),
  ('FUGAZZETTA RELLENA', 'Doble masa rellena de muzzarella y jamón. Arriba aceite de oliva, cebolla, orégano y lluvia de provolone.', 28500),
  ('NAPOLITANA CON JAMÓN', 'Salsa de tomate, muzzarella, rodajas de tomate natural, jamón, morrón, palmitos, provolone, calabresa, huevo duro.', 28500),
  ('CALZONE TRADICIONAL NAPOLITANO', 'Salsa de tomate, muzzarella, jamón, morrones, orégano, ajo, perejil y aceitunas.', 28500),
  ('FAINÁ', 'Porción', 3200),
  ('RECARGOS', 'Porción', 1400),
  ('PIZZA CHICA', 'Porción', 9700),
  ('PIZZA GRANDE', '', 18400)
) AS v(n, d, p);

-- EMPANADAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 15, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='EMPANADAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('EMPANADA PORTEÑA CARNE', 'Caseras', 2900),
  ('EMPANADA CARNE', 'Caseras', 2900),
  ('EMPANADA POLLO', 'Caseras', 2900),
  ('EMPANADA JAMÓN Y QUESO', 'Caseras', 2900),
  ('EMPANADA HUMITA', 'Caseras', 2900),
  ('EMPANADA ROQUEFORT', 'Caseras', 2900),
  ('EMPANADA CEBOLLA Y MUZZARELLA', 'Caseras', 2900),
  ('EMPANADA CAPRESSE', 'Caseras', 2900),
  ('EMPANADA ESPINACA Y SALSA BLANCA', 'Caseras', 2900),
  ('EMPANADA VACÍO', 'Vacío asado durante desmechado con provoleta y vegetales asados. Nueva.', 3300)
) AS v(n, d, p);

-- TARTAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 20, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='TARTAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('PASCUALINA CLÁSICA', 'Clásicas', 9400),
  ('JAMÓN Y QUESO', 'Clásicas', 9400),
  ('ZAPALLITOS', 'Clásicas', 9400),
  ('VERDURAS VARIAS', 'Clásicas', 9400),
  ('ATÚN', 'Clásicas', 9400),
  ('POLLO Y PUERROS', 'Clásicas', 9400)
) AS v(n, d, p);

-- PLATOS Y ENSALADAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 25, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='PLATOS Y ENSALADAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('SOUFFLÉ DE CALABAZA', 'Crema de choclo y zanahoria rallada.', 13700),
  ('MILANESA DE SOJA AL HORNO', 'Con queso Port Salut gratén, rodajas de tomate natural y guarnición de arroz blanco.', 11000),
  ('PECHUGA DE POLLO DESHUESADA GRILLÉ', 'Con salsa de puerros y verduras al vapor.', 16200),
  ('CREPÉS DE ESPINACAS', '', 13700),
  ('BERENJENAS LIGHT', 'Berenjenas con queso Port Salut, rodajas de tomate natural y albahaca.', 14500),
  ('ENSALADA UN GUSTO O DOS', 'Lechuga, tomate, zanahoria, cebolla, remolacha, radicheta, arroz blanco, chaucha, aceitunas, papa, rúcula, repollo, brócoli. Adicional palmitos, atún o pollo +800. Adicional jamón cocido, queso o ananá +800.', 9800),
  ('ENSALADA TRES GUSTOS', '', 10600),
  ('ENSALADA CÉSAR', 'Lechuga, pollo, queso parmesano y croutons.', 14200),
  ('ENSALADA SORAYA', 'Variedad de verdes, queso azul, peras y nueces.', 14200),
  ('ENSALADA MARINERA', 'Arroz, lechuga, apio, tomate, zanahoria, atún y huevo duro.', 14200),
  ('ENSALADA CAPRESSE', 'Muzzarella, tomate, albahaca y aceite de oliva.', 14200)
) AS v(n, d, p);

-- PESCADOS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 25, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='PESCADOS' LIMIT 1) c
CROSS JOIN (VALUES
  ('RABAS A LA ROMANA O A LA PROVENZAL', '', 17800),
  ('FILET DE MERLUZA A LA ROMANA O A LA MILANESA', 'Con puré mixto. Con salsa tártara y verduras al vapor.', 14000),
  ('SALMÓN ROSADO DEL PACÍFICO GRILLÉ', 'Con salsa tártara y verduras al vapor.', 29000),
  ('FILET DE MERLUZA A LA ROMANA O A LA MILANESA', 'Porción grande', 17800)
) AS v(n, d, p);

-- TORTILLAS Y OMELETTES
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 15, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='TORTILLAS Y OMELETTES' LIMIT 1) c
CROSS JOIN (VALUES
  ('TORTILLA A LA ESPAÑOLA', '', 14200),
  ('TORTILLA DE PAPA O VERDURA', '', 13600),
  ('REVUELTO GRAMAJO', '', 13400),
  ('OMELETTE MIXTO (JAMÓN Y QUESO)', '', 11400)
) AS v(n, d, p);

-- PARRILLA
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 30, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='PARRILLA' LIMIT 1) c
CROSS JOIN (VALUES
  ('ACHURAS', 'Con guarnición a elección', 6100),
  ('MORCILLA', 'Con guarnición a elección', 6100),
  ('CHORIZO', 'Con guarnición a elección', 6100),
  ('PROVOLETA PARRILLERA AL OREGANATO', '', 14800),
  ('ASADO DE TIRA', '', 18900),
  ('MATAMBRE TIERNIZADO CON SALSA CRIOLLA', '', 17800),
  ('BIFE DE LOMO', '', 24500),
  ('BIFE DE CHORIZO', '', 23900),
  ('GRAN PARRILLADA MIXTA', 'Asado, muslo de pollo deshuesado, chorizo, morcilla, riñón, chinchulín, morrón, porción de papas fritas o ensalada mixta. Para dos personas.', 45000),
  ('ENTRADA JAMÓN COCIDO, CRUDO, LONGANIZA, QUESO TYBO, QUESO AZUL, CHORIZO COLORADO, MATAMBRE CASERO Y QUESO SARDO', '', 24200),
  ('JAMÓN CRUDO CON ENSALADA RUSA', '', 15900),
  ('BUÑUELOS DE ACELGA', '', 7200),
  ('MATAMBRE CASERO CON ENSALADA RUSA', '', 17200),
  ('PECHUGA DE POLLO DESHUESADO', 'Con guarnición a elección', 14700),
  ('MUSLO DE POLLO DESHUESADO', 'Con guarnición a elección', 16900),
  ('MUSLO DE POLLO DESHUESADO A LA PROVENZAL', 'Con papas españolas', 15500),
  ('MUSLO DE POLLO DESHUESADO A LA PIZZA', 'Con papas españolas', 15500),
  ('MUSLO DE POLLO DESHUESADO AL VERDEO', 'Con papas españolas', 15500),
  ('PECHUGA DE POLLO DESHUESADA AL CHAMPIGNON', 'Con papas noisette', 17200),
  ('PECHUGA DE POLLO DESHUESADA A LA MOSTAZA', 'Con papas noisette', 17200),
  ('PECHUGA DE POLLO DESHUESADA A LA FLORENTINA', 'Con espinaca a la crema y papas noisette', 17200),
  ('LOMO A LA MOSTAZA', 'Con papas noisette', 33000),
  ('LOMO AL CHAMPIGNON', 'Con papas noisette', 33000),
  ('LOMO A LA PIMIENTA', 'Con papas a la crema', 33000),
  ('MATAMBRITO TIERNIZADO A LA PIZZA', 'Con papas fritas o papas españolas', 22000)
) AS v(n, d, p);

-- PASTAS CASERAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 25, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='PASTAS CASERAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('SPAGHETTI AL HUEVO', 'Salsas a elección: filetto, salsa blanca, mixta, a la manteca, crema o pesto', 11300),
  ('ÑOQUIS DE PAPA', 'Salsas a elección', 11300),
  ('RAVIOLES DE RICOTTA', 'Salsas a elección', 14400),
  ('RAVIOLES DE POLLO Y VERDURA', 'Salsas a elección', 14400),
  ('SORRENTINOS DE MUZZARELLA Y JAMÓN', 'Salsas a elección', 14400),
  ('LASAGNA RELLENA DE POLLO, VERDURA, RICOTTA Y JAMÓN', 'Salsas a elección', 14400),
  ('GRAN CANELÓN RELLENO DE POLLO Y VERDURA', 'Salsas a elección', 14400),
  ('SALSA BOLOGNESA', 'Salsa de tomate, cebolla, morrón, apio, zanahoria y carne picada', 4800),
  ('SALSA FILETTO', '', 4800),
  ('SALSA BLANCA', '', 4800),
  ('SALSA MIXTA', '', 4800),
  ('SALSA A LA MANTECA', '', 4800),
  ('SALSA CREMA', '', 4800),
  ('SALSA PESTO', '', 4800),
  ('SALSA PRÍNCIPE DI NÁPOLES', 'Queso gratinado y lluvia de albahaca', 4800),
  ('SALSA SCARPARO', 'Crema y champignones', 4800),
  ('SALSA PARISIENNE', 'Pollo, jamón, salsa bechamel al gratén', 4800),
  ('SALSA A LOS 4 QUESOS', 'Queso provolone, roquefort, fontina y port salut', 4800),
  ('ESTOFADO DE CARNE O POLLO', '', 4800)
) AS v(n, d, p);

-- MILANESAS Y SUPREMAS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 25, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='MILANESAS Y SUPREMAS' LIMIT 1) c
CROSS JOIN (VALUES
  ('MILANESA DE TERNERA', '', 13400),
  ('MILANESA DE TERNERA A LA NAPOLITANA CON PAPAS FRITAS', '', 14900),
  ('MILANESA DE TERNERA A LA SUIZA CON PAPAS NOISETTE', '', 14900),
  ('MILANESA DE POLLO', '', 12000),
  ('MILANESA DE POLLO A LA NAPOLITANA CON PAPAS FRITAS', '', 13600),
  ('SUPREMA DE POLLO', '', 12800),
  ('SUPREMA DE POLLO A LA NAPOLITANA CON PAPAS FRITAS', '', 15900),
  ('SUPREMA DE POLLO A LA SUIZA CON PAPAS NOISETTE', '', 19800),
  ('SUPREMA DE POLLO A LA MARYLAND', '', 19800),
  ('LOMITOS DE POLLO A LA MILANESA CON PAPAS FRITAS', '', 15000),
  ('PAPAS FRITAS', 'Porción', 7900),
  ('PAPAS FRITAS A LA PROVENZAL', '', 7900),
  ('PAPAS NOISETTE O ESPAÑOLAS', '', 8800),
  ('PAPA NATURAL O PURÉ DE PAPA', '', 7900),
  ('GUARNICIÓN DE PAPAS FRITAS, PURÉ, ARROZ O ENSALADA MIXTA', '', 6500),
  ('VERDURAS SALTEADAS', 'Chaucha, zanahoria, brócoli, espinaca, zapallitos y berenjena', 9000),
  ('PURÉ DE CALABAZA', '', 7600),
  ('PAPAS A LA CREMA DE VERDEO', '', 11000),
  ('PAPAS FRITAS CON CHEDAR Y PANCETA', '', 11000),
  ('HUEVO FRITO O A LA PLANCHA', 'Cada uno', 2900)
) AS v(n, d, p);

-- POSTRES Y HELADOS
INSERT INTO menu_items (id, restaurant_id, category_id, subcategory_id, name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, is_new, is_available, preparation_time_min, dietary_tags, customer_customization)
SELECT gen_random_uuid(), '6283c4ef-910a-403b-8759-3e75e1798c51', c.id, NULL, v.n, v.d, v.p, '', 0, 0, 0, 0, 0, 0, 0, 0, false, false, true, 5, ARRAY[]::text[], '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM (SELECT id FROM categories WHERE restaurant_id='6283c4ef-910a-403b-8759-3e75e1798c51' AND name='POSTRES Y HELADOS' LIMIT 1) c
CROSS JOIN (VALUES
  ('FLAN', '', 5500),
  ('FLAN MIXTO', '', 5900),
  ('BUDÍN DE PAN', '', 5500),
  ('BUDÍN DE PAN MIXTO', '', 5900),
  ('ENSALADA DE FRUTAS', '', 5500),
  ('ENSALADA DE FRUTAS CON HELADO', '', 5900),
  ('FRUTAS DE ESTACIÓN', 'Una: Banana, Manzana, Naranja', 5500),
  ('FRUTILLAS CON CREMA', '', 5900),
  ('CRUMBLE DE MANZANA CON HELADO DE CREMA', '', 7400),
  ('PAVLOVA CON FRUTAS Y HELADO', '', 14300),
  ('PANQUEQUE QUEMADO AL RHUM CON HELADO DE CREMA', '', 11300),
  ('VOLCÁN DE CHOCOLATE CON HELADO', '', 14300),
  ('POSTRE BALCARCE SORAYA', '', 7200),
  ('COPA MELBA', 'Helado a elección, crema chantilli, durazno y obleas. Nuevo.', 11000),
  ('CREMA AMERICANA', '', 11000),
  ('HELADO', 'Chocolate, dulce de leche, frutilla, limón', 8300),
  ('ALMENDRADO', '', 8300),
  ('ALMENDRADO CON CHOCOLATE', '', 9800),
  ('BOMBÓN SUIZO', '', 8300),
  ('HELADO MIXTO', '', 9800),
  ('COPA SORAYA', 'Frutas, crema chantilli, obleas, frutillas, nueces y suave baño de salsa de chocolate', 9800),
  ('DON PEDRO', 'Helado, whisky, crema y nueces', 27600)
) AS v(n, d, p);

-- Verificación final
SELECT c.name as categoria, COUNT(mi.id) as platos
FROM categories c
LEFT JOIN menu_items mi ON mi.category_id = c.id AND mi.restaurant_id = '6283c4ef-910a-403b-8759-3e75e1798c51'
WHERE c.restaurant_id = '6283c4ef-910a-403b-8759-3e75e1798c51'
GROUP BY c.id, c.name
ORDER BY c.sort_order;
