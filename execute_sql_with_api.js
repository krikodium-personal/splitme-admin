#!/usr/bin/env node

/**
 * Script para Ejecutar SQL en Supabase usando la API REST
 * 
 * REQUISITOS:
 * 1. Obtener el service_role key de Supabase (Settings > API > service_role)
 * 2. Crear un archivo .env.local con: SUPABASE_SERVICE_ROLE_KEY=tu_key
 * 
 * USO:
 *   node execute_sql_with_api.js archive_order_function.sql
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Cargar variables de entorno
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hqaiuywzklrwywdhmqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`
❌ ERROR: Se requiere SUPABASE_SERVICE_ROLE_KEY

Para obtener el service_role key:
1. Ve a: https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/settings/api
2. Copia el "service_role" key (⚠️ NO el anon key)
3. Crea un archivo .env.local con:
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

Luego ejecuta:
  node execute_sql_with_api.js archive_order_function.sql
`);
  process.exit(1);
}

async function executeSQL(sqlFile) {
  try {
    const sqlPath = join(__dirname, sqlFile);
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📝 Leyendo archivo SQL:', sqlFile);
    console.log('🔄 Ejecutando SQL en Supabase...\n');

    // Supabase no tiene una API REST directa para ejecutar SQL arbitrario
    // Necesitamos usar el Management API o la CLI
    // Por ahora, mostramos el SQL y damos instrucciones

    console.log('⚠️  NOTA: Supabase no permite ejecutar SQL DDL arbitrario vía API REST.');
    console.log('   Para ejecutar SQL, usa una de estas opciones:\n');
    
    console.log('📋 OPCIÓN 1: SQL Editor (Recomendado)');
    console.log('   1. Ve a: https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/sql/new');
    console.log('   2. Copia y pega el siguiente SQL:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('\n');

    console.log('📋 OPCIÓN 2: Supabase CLI');
    console.log('   1. Instala: npm install -g supabase');
    console.log('   2. Login: supabase login');
    console.log('   3. Link: supabase link --project-ref hqaiuywzklrwywdhmqxw');
    console.log('   4. Ejecuta: supabase db execute --file archive_order_function.sql\n');

    console.log('📋 OPCIÓN 3: psql (PostgreSQL directo)');
    console.log('   1. Obtén la connection string de: Settings > Database');
    console.log('   2. Ejecuta: psql "connection_string" < archive_order_function.sql\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const sqlFile = process.argv[2] || 'archive_order_function.sql';
executeSQL(sqlFile);

