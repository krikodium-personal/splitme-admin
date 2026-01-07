#!/usr/bin/env node

/**
 * Script para ejecutar el SQL de archivado en Supabase
 * 
 * NOTA: Para ejecutar DDL (CREATE TABLE, CREATE FUNCTION) necesitas:
 * 1. El service_role key de Supabase (no el anon key)
 * 2. O ejecutarlo manualmente en el SQL Editor de Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hqaiuywzklrwywdhmqxw.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(`
❌ ERROR: Se requiere SUPABASE_SERVICE_ROLE_KEY para ejecutar DDL.

Para obtener el service_role key:
1. Ve a tu proyecto en Supabase Dashboard
2. Settings > API
3. Copia el "service_role" key (NO el anon key)

Luego ejecuta:
  SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key node execute_archive_sql.js

O mejor aún, ejecuta el SQL manualmente en el SQL Editor de Supabase:
1. Ve a https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/sql
2. Copia y pega el contenido de archive_order_function.sql
3. Haz clic en "Run"
`);
  process.exit(1);
}

async function executeSQL() {
  try {
    // Crear cliente con service_role para permisos de administrador
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Leer el archivo SQL
    const sqlFile = join(__dirname, 'archive_order_function.sql');
    const sql = readFileSync(sqlFile, 'utf-8');

    console.log('📝 Leyendo archivo SQL...');
    console.log('🔄 Ejecutando SQL en Supabase...\n');

    // Dividir el SQL en statements (separados por ;)
    // Nota: Esto es una aproximación simple, para SQL complejo es mejor usar el SQL Editor
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Encontrados ${statements.length} statements SQL\n`);

    // Intentar ejecutar usando RPC (esto no funcionará para DDL, pero lo intentamos)
    // Para DDL real, necesitas usar el SQL Editor de Supabase
    console.log('⚠️  NOTA: Los comandos DDL (CREATE TABLE, CREATE FUNCTION)');
    console.log('   deben ejecutarse en el SQL Editor de Supabase.\n');
    console.log('📋 Para ejecutar manualmente:');
    console.log('   1. Ve a: https://supabase.com/dashboard/project/hqaiuywzklrwywdhmqxw/sql');
    console.log('   2. Copia el contenido de: archive_order_function.sql');
    console.log('   3. Pega y ejecuta en el SQL Editor\n');

    // Mostrar el SQL para copiar
    console.log('📄 Contenido del SQL:\n');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

executeSQL();

