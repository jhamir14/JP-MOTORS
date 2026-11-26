#!/usr/bin/env bash
# Inversiones JP · Copia lógica de la base (complementa los backups automáticos de Railway).
#
#   DATABASE_URL="postgresql://..." ./database/respaldo.sh            → respaldos/jp_AAAAMMDD_HHMM.dump
#   pg_restore --clean --if-exists --no-owner -d "$DESTINO" archivo.dump  → restaurar (en una base de PRUEBA primero)
#
# Usa la URL pública de Railway (DATABASE_PUBLIC_URL). El archivo contiene datos personales (DNI, teléfonos,
# documentos KYC): guárdalo cifrado y fuera del repositorio; respaldos/ está en .gitignore.
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL}"
command -v pg_dump >/dev/null || { echo "Instala el cliente de PostgreSQL 16 (pg_dump)"; exit 1; }
dir="$(dirname "$0")/../respaldos"
mkdir -p "$dir"
archivo="$dir/jp_$(date +%Y%m%d_%H%M).dump"
PGSSLMODE="${PGSSLMODE:-require}" pg_dump --format=custom --no-owner --no-privileges --file="$archivo" "$DATABASE_URL"
chmod 600 "$archivo"
echo "Respaldo creado: $archivo ($(du -h "$archivo" | cut -f1))"
pg_restore --list "$archivo" > /dev/null && echo "Verificado: el archivo se puede leer con pg_restore."
