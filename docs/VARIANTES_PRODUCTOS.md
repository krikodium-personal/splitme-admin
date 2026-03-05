# Variantes de productos – Guía para app del comensal

## Resumen del modelo

| Producto | Grupo de variante | Tipo de precio | Ejemplo |
|----------|-------------------|----------------|---------|
| **Pizza** | Tamaño | `replace` | Grande $12.000, Chica $8.000, Porción $2.500 |
| **Pasta** | Salsa | `add` | Fileto $0, Alfredo +$2.000, Pesto +$1.500 |

- **`replace`**: el precio de la opción reemplaza el precio base del producto.
- **`add`**: el precio de la opción se suma al precio base (0 = incluida, >0 = recargo).

---

## Estructura de datos (Supabase)

### Tablas

- **`variant_groups`**: grupos por producto (ej: "Tamaño", "Salsa").
- **`variant_options`**: opciones de cada grupo con `price_type` y `price_amount`.
- **`order_items.variant_selections`**: JSONB `{ "variant_group_id": "variant_option_id" }`.

### Consulta para obtener productos con variantes

```sql
-- Obtener menu_items con sus variant_groups y variant_options
SELECT 
  mi.*,
  json_agg(
    json_build_object(
      'id', vg.id,
      'name', vg.name,
      'required', vg.required,
      'sort_order', vg.sort_order,
      'variant_options', (
        SELECT json_agg(
          json_build_object(
            'id', vo.id,
            'name', vo.name,
            'price_type', vo.price_type,
            'price_amount', vo.price_amount,
            'sort_order', vo.sort_order
          ) ORDER BY vo.sort_order
        )
        FROM variant_options vo
        WHERE vo.variant_group_id = vg.id
      )
    ) ORDER BY vg.sort_order
  ) FILTER (WHERE vg.id IS NOT NULL) as variant_groups
FROM menu_items mi
LEFT JOIN variant_groups vg ON vg.menu_item_id = mi.id
WHERE mi.restaurant_id = $1 AND mi.is_available = true
GROUP BY mi.id;
```

---

## Flujo en la app del comensal

### 1. Mostrar producto con variantes

Si `menu_item.variant_groups?.length > 0`:

- Mostrar cada grupo (ej: "Tamaño", "Salsa").
- Mostrar opciones por grupo con su precio:
  - `replace`: mostrar el precio total (ej: "Grande $12.000").
  - `add`: si `price_amount === 0` → "Incluida"; si `> 0` → "+$2.000".

### 2. Calcular precio al elegir

```typescript
function calculatePrice(
  menuItem: MenuItem,
  variantSelections: Record<string, string>,
  variantGroups: VariantGroup[]
): number {
  let price = menuItem.price;

  for (const group of variantGroups) {
    const optionId = variantSelections[group.id];
    if (!optionId) continue;

    const option = group.variant_options?.find((o) => o.id === optionId);
    if (!option) continue;

    if (option.price_type === 'replace') {
      price = option.price_amount;
    } else if (option.price_type === 'add') {
      price += option.price_amount;
    }
  }

  return price;
}
```

### 3. Validar antes de agregar al carrito

- Si `required === true` en algún grupo, debe haber al menos una opción para ese grupo.
- Si falta, no permitir agregar y mostrar mensaje de error.

### 4. Agregar al carrito / crear order_item

```typescript
const orderItem = {
  batch_id: currentBatchId,
  menu_item_id: menuItem.id,
  name: menuItem.name,
  quantity: 1,
  unit_price: calculatePrice(menuItem, variantSelections, variantGroups),
  variant_selections: variantSelections,
  notes: notes || null,
};
```

### 5. Mostrar en el resumen

```typescript
// Ej: "Pizza Margherita - Grande"
// Ej: "Ñoquis - Salsa Alfredo (+$2.000)"
function formatOrderItemName(menuItem: MenuItem, variantSelections: VariantSelections, variantGroups: VariantGroup[]): string {
  const parts = [menuItem.name];
  for (const group of variantGroups) {
    const optionId = variantSelections[group.id];
    const option = group.variant_options?.find((o) => o.id === optionId);
    if (option) {
      const suffix = option.price_type === 'add' && option.price_amount > 0
        ? ` (+$${option.price_amount.toLocaleString()})`
        : '';
      parts.push(`${option.name}${suffix}`);
    }
  }
  return parts.join(' - ');
}
```

---

## Próximos pasos en el admin

1. **CreateItemPage**: UI para gestionar `variant_groups` y `variant_options` al crear/editar productos.
2. **OrdersPage**: mostrar `variant_selections` en el detalle de cada item (ej: "Grande", "Salsa Alfredo").

---

## Notas

- `menu_items.price` sigue siendo el precio base (por defecto).
- Para productos con `replace`, el precio base se usa solo si no hay variantes o como fallback.
- `order_items.unit_price` siempre debe ser el precio final calculado.
