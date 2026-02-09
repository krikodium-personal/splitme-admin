# Credenciales para app Splitme Meseros

Para que los meseros puedan iniciar sesión en la app splitme-waiter, sigue estos pasos:

## 1. Ejecutar script SQL en Supabase

En el SQL Editor de Supabase, ejecuta:

**add_waiter_credentials_columns.sql** – agrega las columnas `email` y `user_id` a la tabla `waiters`

*(Alternativa: ejecutar en orden add_waiter_user_id.sql y add_waiter_email.sql si ya los tienes.)*

## 2. Desplegar la Edge Function

La Edge Function `create-waiter-auth` crea usuarios en Auth y los vincula al mesero. Despliega con:

```bash
cd splitme-admin
supabase functions deploy create-waiter-auth
```

Asegúrate de tener configurado el proyecto Supabase (`supabase link` si aplica).

## 3. Uso desde el Admin

En la ficha de cada mesero, rellena:

- **Email**: correo con el que el mesero iniciará sesión en splitme-waiter
- **Contraseña**: mín. 6 caracteres (solo al crear credenciales o al cambiarlas)

Al guardar, se creará el usuario en Auth y se vinculará al mesero. Si el mesero ya tiene credenciales y cambias la contraseña, se actualizará.
