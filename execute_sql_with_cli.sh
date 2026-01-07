#!/bin/bash

# ============================================
# Script para Ejecutar SQL en Supabase usando CLI
# ============================================
# 
# REQUISITOS:
# 1. Instalar Supabase CLI: npm install -g supabase
# 2. Autenticarte: supabase login
# 3. Linkear tu proyecto: supabase link --project-ref hqaiuywzklrwywdhmqxw
#
# USO:
#   ./execute_sql_with_cli.sh archive_order_function.sql
# ============================================

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar el archivo SQL"
  echo "Uso: ./execute_sql_with_cli.sh <archivo.sql>"
  exit 1
fi

SQL_FILE="$1"

if [ ! -f "$SQL_FILE" ]; then
  echo "❌ Error: El archivo $SQL_FILE no existe"
  exit 1
fi

echo "📝 Ejecutando SQL desde: $SQL_FILE"
echo "🔄 Enviando a Supabase..."

# Ejecutar SQL usando Supabase CLI
supabase db execute --file "$SQL_FILE"

if [ $? -eq 0 ]; then
  echo "✅ SQL ejecutado correctamente"
else
  echo "❌ Error al ejecutar SQL"
  exit 1
fi

