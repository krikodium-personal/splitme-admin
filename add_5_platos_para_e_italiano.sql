-- Script para agregar 5 platos a la subcategoría "Para e italiano"
-- Busca la subcategoría por nombre (incluye "Pasta e italiano" por si hay typo)
-- Ejecuta en el SQL Editor de Supabase

-- Paso 1: Verificar que existe la subcategoría (ejecutar primero para confirmar)
SELECT 
    c.id as subcategory_id,
    c.name as subcategory_name,
    c.parent_id as category_id,
    c.restaurant_id
FROM categories c
WHERE c.parent_id IS NOT NULL
  AND (c.name ILIKE '%Para e italiano%' OR c.name ILIKE '%Pasta e italiano%');

-- Paso 2: Insertar 5 platos italianos (usa subquery para encontrar la subcategoría automáticamente)
WITH sub AS (
    SELECT id, parent_id, restaurant_id
    FROM categories
    WHERE parent_id IS NOT NULL
      AND (name ILIKE '%Para e italiano%' OR name ILIKE '%Pasta e italiano%')
    LIMIT 1
)
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
)
SELECT
    gen_random_uuid(),
    sub.restaurant_id,
    sub.parent_id,
    sub.id,
    v.name,
    v.description,
    v.price,
    v.image_url,
    v.calories,
    v.protein_g,
    v.total_fat_g,
    v.sat_fat_g,
    v.carbs_g,
    v.sugars_g,
    v.fiber_g,
    v.sodium_mg,
    v.is_featured,
    true,
    v.preparation_time_min,
    ARRAY[]::text[],
    '{"ingredientsToAdd": [], "ingredientsToRemove": []}'::jsonb
FROM sub
CROSS JOIN (VALUES
    ('Spaghetti alla Carbonara'::text, 'Pasta italiana clásica con huevo, guanciale, pecorino y pimienta negra. Cremosa y deliciosa.'::text, 12500, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&h=800&fit=crop'::text, 550, 22, 28, 12, 52, 2, 3, 850, true, 15),
    ('Lasagna alla Bolognese', 'Capas de pasta fresca, salsa boloñesa, bechamel y queso gratinado. Tradición italiana en cada bocado.', 14500, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&h=800&fit=crop', 420, 24, 18, 8, 42, 6, 4, 720, true, 25),
    ('Risotto ai Funghi', 'Arroz arbóreo cremoso con champiñones frescos, mantequilla, parmesano y un toque de vino blanco.', 13500, 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&h=800&fit=crop', 380, 12, 14, 6, 48, 2, 2, 520, false, 22),
    ('Penne all''Arrabbiata', 'Pasta penne con salsa de tomate picante, ajo, guindilla y perejil. Para los amantes del picante.', 9500, 'https://images.unsplash.com/photo-1551183053-bf53a64d38be?w=800&h=800&fit=crop', 420, 14, 8, 2, 68, 10, 4, 480, false, 18),
    ('Gnocchi al Gorgonzola', 'Ñoquis de papa caseros con salsa cremosa de gorgonzola y nueces. Suave y con carácter.', 12800, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800&h=800&fit=crop', 520, 18, 22, 10, 58, 4, 3, 620, false, 20)
) AS v(name, description, price, image_url, calories, protein_g, total_fat_g, sat_fat_g, carbs_g, sugars_g, fiber_g, sodium_mg, is_featured, preparation_time_min);

-- Paso 3: Verificación - mostrar los platos insertados
SELECT 
    mi.name,
    mi.price,
    mi.is_featured,
    c.name as subcategoria
FROM menu_items mi
INNER JOIN categories c ON mi.subcategory_id = c.id
WHERE (c.name ILIKE '%Para e italiano%' OR c.name ILIKE '%Pasta e italiano%')
ORDER BY mi.name;
