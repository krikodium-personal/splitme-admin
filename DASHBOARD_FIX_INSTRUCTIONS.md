# Instrucciones para Corregir el Dashboard

## Problema
El dashboard no muestra datos porque las tablas `dashboard_order_events` y `dashboard_daily_summary` están vacías.

## Solución

### Opción 1: Script Todo-en-Uno (RECOMENDADO)
Ejecuta este script en el SQL Editor de Supabase:

**`fix_dashboard_complete.sql`**

Este script hace TODO automáticamente:
1. ✅ Diagnostica el problema
2. ✅ Corrige los triggers
3. ✅ Migra datos históricos de órdenes cerradas
4. ✅ Verifica que todo funcione

### Opción 2: Scripts Individuales (si prefieres paso a paso)

1. **Diagnóstico primero:**
   ```
   diagnose_dashboard_complete.sql
   ```
   Esto te mostrará qué está pasando.

2. **Corregir triggers:**
   ```
   fix_dashboard_triggers.sql
   ```

3. **Migrar datos históricos:**
   ```
   migrate_historical_dashboard_data.sql
   ```

## Verificación

Después de ejecutar los scripts, verifica:

1. **En Supabase SQL Editor, ejecuta:**
   ```sql
   SELECT COUNT(*) FROM dashboard_order_events;
   SELECT COUNT(*) FROM dashboard_daily_summary;
   ```

2. **Si hay datos, el dashboard debería funcionar.**

3. **Si aún no hay datos:**
   - Verifica que tengas órdenes con `status = 'Pagado'`:
     ```sql
     SELECT COUNT(*) FROM orders WHERE status = 'Pagado';
     ```
   - Si hay órdenes pagadas pero no eventos, ejecuta nuevamente `fix_dashboard_complete.sql`

## Notas Importantes

- El trigger se activa cuando una orden cambia su status a 'Pagado'
- Las órdenes cerradas históricamente se migran automáticamente con el script
- Las nuevas órdenes cerradas se registrarán automáticamente gracias al trigger
