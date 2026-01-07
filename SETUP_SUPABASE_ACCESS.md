# 🔐 Configurar Acceso a Supabase para Automatización

## ⚠️ Importante: Seguridad

No puedo acceder directamente a tu Supabase, pero puedo ayudarte a automatizar la ejecución de SQL. Aquí tienes varias opciones:

## 📋 Opciones Disponibles

### Opción 1: SQL Editor (Más Simple) ⭐ RECOMENDADO

**Ventajas:**
- ✅ No requiere configuración adicional
- ✅ Interfaz visual
- ✅ Puedes ver los resultados inmediatamente

**Pasos:**
1. Ve a: https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/sql/new
2. Copia y pega el SQL
3. Ejecuta

**Cuando usar:** Para ejecuciones puntuales o cuando necesitas verificar resultados.

---

### Opción 2: Supabase CLI (Para Automatización)

**Ventajas:**
- ✅ Puedes ejecutar desde terminal
- ✅ Útil para scripts automatizados
- ✅ Integración con CI/CD

**Instalación:**
```bash
# Instalar CLI
npm install -g supabase

# Autenticarte
supabase login

# Linkear tu proyecto
supabase link --project-ref hqaiuywzklrwywdhmqxw
```

**Uso:**
```bash
# Hacer ejecutable el script
chmod +x execute_sql_with_cli.sh

# Ejecutar SQL
./execute_sql_with_cli.sh archive_order_function.sql
```

**Cuando usar:** Para automatización o cuando ejecutas SQL frecuentemente.

---

### Opción 3: Service Role Key (⚠️ Solo para Scripts Locales)

**⚠️ ADVERTENCIA:** El `service_role` key tiene acceso completo a tu base de datos. **NUNCA** lo compartas públicamente ni lo subas a Git.

**Pasos:**
1. Obtén el service_role key:
   - Ve a: https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/settings/api
   - Copia el "service_role" key (NO el anon key)

2. Crea un archivo `.env.local` (ya está en .gitignore):
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
   ```

3. Ejecuta el script:
   ```bash
   node execute_sql_with_api.js archive_order_function.sql
   ```

**⚠️ Nota:** Supabase no permite ejecutar SQL DDL arbitrario vía API REST. Este script solo muestra el SQL para que lo ejecutes manualmente.

**Cuando usar:** Para scripts que necesitan acceso programático (aunque limitado).

---

### Opción 4: psql (PostgreSQL Directo)

**Ventajas:**
- ✅ Acceso directo a PostgreSQL
- ✅ Puedes ejecutar cualquier SQL

**Pasos:**
1. Obtén la connection string:
   - Ve a: Settings > Database > Connection string
   - Usa la opción "URI" o "Session"

2. Ejecuta:
   ```bash
   psql "postgresql://postgres:[PASSWORD]@db.hqaiuywzklrwywdhmqxw.supabase.co:5432/postgres" < archive_order_function.sql
   ```

**Cuando usar:** Para acceso directo a la base de datos.

---

## 🎯 Recomendación

Para tu caso (ejecutar el SQL de archivado una vez):

1. **Usa el SQL Editor** (Opción 1) - Es lo más simple y seguro
2. Si necesitas automatizar en el futuro, configura la CLI (Opción 2)

## 🔒 Seguridad

- ❌ **NUNCA** subas el `service_role` key a Git
- ✅ El archivo `.env.local` ya está en `.gitignore`
- ✅ Usa el `anon` key para el frontend (ya configurado)
- ✅ Solo usa `service_role` para scripts locales

## 📝 Para Automatización Futura

Si quieres que yo pueda ayudarte a ejecutar SQL automáticamente en el futuro:

1. Configura Supabase CLI (Opción 2)
2. O comparte el service_role key de forma segura (solo localmente, nunca en Git)

Pero por ahora, **el SQL Editor es la mejor opción** para ejecutar el script de archivado.

