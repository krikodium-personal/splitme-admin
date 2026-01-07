# 📋 Instrucciones para Ejecutar el SQL de Archivado

## ✅ El SQL ya está copiado en tu portapapeles

## Pasos para Ejecutar:

1. **Abre el SQL Editor de Supabase**
   - El navegador debería haberse abierto automáticamente
   - O ve manualmente a: https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/sql/new

2. **Pega el SQL**
   - Presiona `Cmd+V` (o `Ctrl+V` en Windows) para pegar el SQL copiado
   - O copia manualmente desde el archivo `archive_order_function.sql`

3. **Ejecuta el SQL**
   - Haz clic en el botón **"Run"** o presiona `Cmd+Enter`
   - Espera a que termine la ejecución

4. **Verifica el resultado**
   - Deberías ver mensajes de éxito como:
     - `CREATE TABLE`
     - `CREATE FUNCTION`
     - `GRANT EXECUTE`
   - Si hay errores, revísalos y corrígelos

## 🔍 Verificar que Funcionó:

Ejecuta esta query en el SQL Editor para verificar:

```sql
-- Verificar que las tablas de historial existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%_archive'
ORDER BY table_name;

-- Verificar que la función existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'archive_order';
```

Deberías ver:
- `order_batches_archive`
- `order_items_archive`
- `order_guests_archive`
- `orders_archive`
- `archive_order` (función)

## ⚠️ Si hay Errores:

- **Error de permisos**: Asegúrate de estar logueado como administrador del proyecto
- **Tabla ya existe**: Los comandos usan `IF NOT EXISTS`, así que es seguro ejecutarlos múltiples veces
- **Función ya existe**: El `CREATE OR REPLACE` actualizará la función si ya existe

## 🎉 Una vez Ejecutado:

El sistema de archivado estará activo. Cada vez que cierres una orden desde la app, los datos se archivarán automáticamente.

