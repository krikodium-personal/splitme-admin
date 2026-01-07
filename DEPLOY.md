# Guía de Deploy a Vercel

## Prerrequisitos

1. Cuenta en [Vercel](https://vercel.com)
2. Repositorio en GitHub, GitLab o Bitbucket (recomendado)
3. Variables de entorno de Supabase configuradas

## Pasos para Deploy

### Opción 1: Deploy desde Vercel Dashboard (Recomendado)

1. **Conectar el repositorio:**
   - Ve a [vercel.com](https://vercel.com)
   - Haz clic en "Add New Project"
   - Importa tu repositorio de GitHub/GitLab/Bitbucket

2. **Configurar el proyecto:**
   - Framework Preset: **Vite**
   - Root Directory: `./` (raíz del proyecto)
   - Build Command: `npm run build` (ya configurado en vercel.json)
   - Output Directory: `dist` (ya configurado en vercel.json)
   - Install Command: `npm install --legacy-peer-deps` (ya configurado en vercel.json)

3. **Configurar Variables de Entorno:**
   - En la sección "Environment Variables", agrega:
     ```
     SUPABASE_URL=tu_url_de_supabase
     SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
     ```
   - Opcional (si usas Gemini API):
     ```
     GEMINI_API_KEY=tu_clave_de_gemini
     ```

4. **Deploy:**
   - Haz clic en "Deploy"
   - Espera a que termine el build
   - Tu aplicación estará disponible en `https://tu-proyecto.vercel.app`

### Opción 2: Deploy desde CLI

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login en Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   - Sigue las instrucciones en la terminal
   - Cuando pregunte por variables de entorno, agrega:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `GEMINI_API_KEY` (opcional)

4. **Deploy a producción:**
   ```bash
   vercel --prod
   ```

## Configuración de Variables de Entorno en Vercel

Después del primer deploy, puedes agregar/editar variables de entorno:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega las variables necesarias:
   - `SUPABASE_URL`: URL de tu proyecto Supabase
   - `SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `GEMINI_API_KEY`: (Opcional) Clave de API de Gemini

## Verificación Post-Deploy

1. Verifica que la aplicación carga correctamente
2. Prueba el login
3. Verifica que las conexiones a Supabase funcionan
4. Revisa los logs en Vercel Dashboard si hay errores

## Notas Importantes

- El archivo `vercel.json` ya está configurado para manejar rutas SPA (Single Page Application)
- Todas las rutas redirigen a `index.html` para que React Router funcione correctamente
- El build genera los archivos en la carpeta `dist/`
- Las variables de entorno se inyectan durante el build

## Troubleshooting

### Error: "Module not found"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `npm install --legacy-peer-deps` se ejecute correctamente

### Error: "Environment variables not found"
- Verifica que las variables de entorno estén configuradas en Vercel Dashboard
- Asegúrate de que los nombres coincidan exactamente (case-sensitive)

### Error: "404 on routes"
- Verifica que `vercel.json` tenga la configuración de `rewrites` correcta
- Asegúrate de que `outputDirectory` sea `dist`

### Build falla
- Revisa los logs en Vercel Dashboard
- Verifica que todas las importaciones sean correctas
- Asegúrate de que no haya errores de TypeScript

