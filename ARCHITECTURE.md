# Arquitectura Técnica de Splitme Admin

## 1. Visión General (The "Elevator Pitch")

Splitme Admin es una Single Page Application (SPA) de alto rendimiento construida con React 19 y Supabase. Actúa como el centro neurálgico para dueños de restaurantes y personal de cocina. Su propósito es gestionar el ciclo de vida completo de un restaurante: desde la creación del menú y la configuración de mesas con QR, hasta el monitoreo de comandas en tiempo real (Kitchen Monitor) y el procesamiento de pagos.

## 2. Stack Tecnológico

- **Frontend Core**: React 19 (importado vía ESM)
- **Routing**: react-router-dom con HashRouter
- **Estilos**: Tailwind CSS (utilitario y responsivo)
- **Backend-as-a-Service**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Iconografía**: Lucide-React
- **Herramientas Especiales**: 
  - `html-to-image` para la generación dinámica de identificadores de mesa
  - `qrcode.react` para la generación de códigos QR

## 3. Arquitectura y Estructura de Datos

El proyecto utiliza una estructura de **Multitenancy (Multi-inquilino)** basada en `restaurant_id`.

### `types.ts`: El Contrato de Datos

Este archivo define el contrato de datos y es la **"fuente de verdad"**. Destacan las interfaces:

- `MenuItem`: Define la estructura de los platos del menú, incluyendo `customer_customization` (ingredientes que se añaden o quitan)
- `Order`: Representa una orden de mesa (puede tener múltiples lotes)
- `OrderBatch`: Representa un lote de pedidos dentro de una orden
- `Restaurant`: Información del restaurante
- `Profile`: Perfil de usuario con roles y `restaurant_id`

### Estado Global (`CURRENT_RESTAURANT`)

Se utiliza un patrón de **variable exportada con setters** para mantener el contexto del restaurante actual sin sobrecargar el árbol de componentes con Context Providers innecesarios, facilitando el acceso desde cualquier módulo:

```typescript
export let CURRENT_RESTAURANT: Restaurant | null = null;

export const setGlobalRestaurant = (r: Restaurant) => {
  CURRENT_RESTAURANT = r;
};
```

Esto permite acceso directo a `CURRENT_RESTAURANT` desde cualquier componente sin necesidad de prop drilling o context providers.

## 4. Flujo de Autenticación y Autorización

### Login (`LoginPage.tsx`)

Maneja el inicio de sesión vía Supabase Auth.

### Perfiles y Roles

Al iniciar sesión, se consulta la tabla `profiles`. Existen dos roles:

- **`super_admin`**: Acceso a `SuperAdminPage.tsx` para gestionar todos los locales de la red
- **`restaurant_admin`**: Acceso al dashboard específico de su `restaurant_id`

### Persistencia

`App.tsx` escucha los cambios de estado de auth (`onAuthStateChange`) para re-hidratar el perfil y el restaurante global mediante `setGlobalRestaurant()`.

## 5. El Corazón: Kitchen Monitor (`OrdersPage.tsx`)

Este es el módulo más complejo y crítico. Su flujo funciona así:

### Polling & Realtime

Utiliza `supabase.channel` para escuchar eventos `INSERT` y `UPDATE` en las tablas:
- `orders`
- `order_batches`
- `order_items`

### Lógica de Lotes (Batches)

Una **"Orden"** (Mesa) puede tener múltiples **"Lotes"** (pedidos sucesivos). Cada lote representa un envío adicional de pedidos desde la misma mesa.

### Estado Dinámico

- **Auto-expansión**: Cuando entra un lote nuevo, la mesa salta al principio de la lista y se expande automáticamente (`forceExpanded`)
- **Ordenamiento por Actividad**: Las mesas se ordenan por `lastActivity` (la fecha del último lote recibido), **no** por la fecha de apertura de la mesa

```typescript
// Calcular el timestamp de la actividad más reciente (orden o último lote)
const latestBatchTime = orderBatches.length > 0 
  ? Math.max(...orderBatches.map((b: any) => new Date(b.created_at).getTime()))
  : new Date(order.created_at).getTime();

const lastActivity = Math.max(new Date(order.created_at).getTime(), latestBatchTime);
```

### Ciclo de Vida del Plato

```
PENDIENTE → EN PREPARACIÓN → LISTO → SERVIDO
```

Cada transición de estado actualiza la base de datos y dispara eventos realtime que refrescan la UI automáticamente.

## 6. Gestión de Recursos

### Menu Management (`CreateItemPage.tsx` / `MenuListPage.tsx`)

CRUD completo con soporte para:
- Tags dietéticos (`dietary_tags`)
- Información nutricional (`nutrition`: calories, protein, fat, carbs, etc.)
- Carga de imágenes a Supabase Storage
- **Customización de clientes**: `customer_customization` con `ingredientsToAdd` e `ingredientsToRemove`

### Mesas y QR (`TablesPage.tsx`)

- Genera URLs dinámicas para la App de Comensales (Guest App)
- Permite descargar el diseño del QR convertido en imagen (`html-to-image`)

### Staff (`WaitersPage.tsx`)

Gestiona meseros y su asignación a mesas, incluyendo:
- Métricas de antigüedad
- Ratings de servicio

## 7. Feedback y Analytics (`FeedbackPage.tsx`)

- Consume una vista de base de datos (`platos_rating_summary`) para mostrar rankings de popularidad
- Implementa un **"Muro de Voces"** que muestra comentarios de clientes en tiempo real
- Permite al administrador reaccionar a problemas de servicio instantáneamente

## 8. Integración de Pagos (`SettingsPage.tsx`)

- Configura la pasarela de Mercado Pago
- Almacena `public_key` y `access_token` de forma segura por restaurante
- `App.tsx` tiene un listener global que dispara un **Toast Notification con sonido** cuando se detecta un registro en la tabla `payments`

## Resumen para Cursor

> **"Cuando trabajes en este proyecto, recuerda que la reactividad es clave. La mayoría de las tablas dependen de `restaurant_id`. Si modificas el monitor de cocina, asegúrate de no romper la lógica de `lastActivity`. Si trabajas en el menú, respeta la estructura de `customer_customization` (ingredientes que se añaden o quitan)."**

### Puntos Críticos a Considerar

1. **Multitenancy**: Siempre filtrar por `restaurant_id` en las consultas
2. **Kitchen Monitor**: 
   - No alterar la lógica de `lastActivity` sin revisar el impacto en el ordenamiento
   - Mantener la reactividad realtime intacta
3. **MenuItem Customization**: Respetar la estructura de `customer_customization` con `ingredientsToAdd` e `ingredientsToRemove`
4. **Estado Global**: Usar `CURRENT_RESTAURANT` directamente, no crear context providers innecesarios
5. **Realtime**: La mayoría de las páginas críticas usan canales de Supabase Realtime - asegurarse de limpiar las suscripciones correctamente

