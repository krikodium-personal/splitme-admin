# Estrategia de Archivado de Órdenes

## 🎯 Objetivo

Optimizar el rendimiento de la aplicación moviendo órdenes cerradas y sus datos relacionados a tablas de historial, manteniendo las tablas activas pequeñas y rápidas.

## 📊 Problema Actual

Con el crecimiento del negocio, las tablas `orders`, `order_batches`, `order_items` y `order_guests` pueden llegar a tener millones de registros. Esto causa:

- **Consultas lentas**: Buscar órdenes activas requiere filtrar entre millones de registros
- **Índices grandes**: Los índices se vuelven lentos de mantener
- **Costo de almacenamiento**: Más datos = más costo en Supabase
- **Tiempo de respuesta**: La app se vuelve lenta para los usuarios

## ✅ Solución: Sistema de Archivado

### Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  TABLAS ACTIVAS (Solo órdenes abiertas)                │
│  - orders (status: ABIERTO, SOLICITADO)                 │
│  - order_batches (de órdenes abiertas)                  │
│  - order_items (de batches de órdenes abiertas)        │
│  - order_guests (de órdenes abiertas)                   │
│                                                         │
│  ✅ Rápidas: Solo contienen datos activos              │
│  ✅ Escalables: Crecen lentamente                      │
└─────────────────────────────────────────────────────────┘
                    ↓ (al cerrar orden)
┌─────────────────────────────────────────────────────────┐
│  TABLAS DE HISTORIAL (Órdenes cerradas)                │
│  - orders_archive                                       │
│  - order_batches_archive                                │
│  - order_items_archive                                  │
│  - order_guests_archive                                 │
│                                                         │
│  ✅ Separadas: No afectan consultas activas            │
│  ✅ Completas: Mantienen todos los datos históricos    │
│  ✅ Consultables: Disponibles para reportes/analytics   │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Flujo de Archivado

1. **Usuario cierra una cuenta** → Orden cambia a status `'Pagado'`
2. **Sistema libera la mesa** → Mesa cambia a `'Libre'`
3. **Sistema archiva automáticamente**:
   - Mueve `order` → `orders_archive`
   - Mueve todos los `order_batches` → `order_batches_archive`
   - Mueve todos los `order_items` → `order_items_archive`
   - Mueve todos los `order_guests` → `order_guests_archive`
   - Elimina registros de tablas activas

## 📝 Implementación

### Paso 1: Crear Tablas de Historial

Ejecuta `archive_order_function.sql` en el SQL Editor de Supabase. Este script:

- Crea las tablas `*_archive` con la misma estructura que las originales
- Agrega columna `archived_at` para tracking
- Crea índices para búsquedas rápidas en historial
- Crea función RPC `archive_order()` para automatizar el proceso

### Paso 2: Modificar Código de Cierre

El código en `OrdersPage.tsx` ya está actualizado para llamar a `archive_order()` automáticamente después de cerrar una orden.

### Paso 3: Verificar Funcionamiento

Después de ejecutar el SQL:
1. Cierra una orden desde la app
2. Verifica en Supabase que los datos se movieron a `*_archive`
3. Verifica que las tablas activas ya no contienen esos registros

## 🔍 Consultas de Historial

Para acceder a datos históricos (reportes, analytics), usa la función:

```sql
SELECT * FROM get_archived_orders(
  'restaurant_id'::UUID,
  '2024-01-01'::TIMESTAMP,  -- start_date (opcional)
  '2024-12-31'::TIMESTAMP   -- end_date (opcional)
);
```

O consulta directamente las tablas `*_archive`:

```sql
-- Órdenes archivadas de un restaurante
SELECT * FROM orders_archive 
WHERE restaurant_id = 'xxx' 
ORDER BY archived_at DESC;

-- Items de una orden archivada
SELECT oi.*, ob.order_id
FROM order_items_archive oi
JOIN order_batches_archive ob ON oi.batch_id = ob.id
WHERE ob.order_id = 'order_id';
```

## ⚡ Beneficios

1. **Rendimiento**: Consultas activas 10-100x más rápidas
2. **Escalabilidad**: Puede manejar millones de órdenes históricas sin impacto
3. **Costo**: Menos datos en tablas activas = menos costo de queries
4. **Mantenimiento**: Índices más pequeños y rápidos de actualizar
5. **Historial completo**: Todos los datos se mantienen para reportes

## ⚠️ Consideraciones

- **Backup**: Las tablas `*_archive` son críticas, asegúrate de tener backups
- **RLS**: Las políticas RLS también aplican a las tablas de historial
- **Reportes**: Si necesitas reportes históricos, consulta las tablas `*_archive`
- **Migración**: Para órdenes existentes cerradas, puedes crear un script de migración

## 🚀 Próximos Pasos

1. ✅ Ejecutar `archive_order_function.sql` en Supabase
2. ✅ Probar cerrar una orden y verificar el archivado
3. ⏳ (Opcional) Crear script para archivar órdenes cerradas existentes
4. ⏳ (Opcional) Crear dashboard de reportes históricos

