#!/usr/bin/env python3
"""Genera el código de la Railway Function: migrar.ts con las migraciones SQL incrustadas.

Uso: python3 database/railway/construir_funcion.py [SALIDA.ts] [--remoto COMMIT_SHA]
  (salida por defecto: database/railway/dist/funcion.ts)
  --remoto: en lugar de incrustar el SQL, la función lo descarga de GitHub en ese commit y verifica su SHA-256.
"""
import hashlib
import json
import sys
from pathlib import Path

raiz = Path(__file__).resolve().parent
migraciones = sorted((raiz.parent / "migrations").glob("*.sql"))
args = sys.argv[1:]
sha = None
if "--remoto" in args:
    i = args.index("--remoto")
    sha = args[i + 1]
    del args[i : i + 2]
REPO_RAW = "https://raw.githubusercontent.com/jhamir14/JP-MOTORS"
if sha:
    datos = [
        {
            "nombre": m.stem,
            "url": f"{REPO_RAW}/{sha}/database/migrations/{m.name}",
            "sha256": hashlib.sha256(m.read_bytes()).hexdigest(),
        }
        for m in migraciones
    ]
else:
    datos = [{"nombre": m.stem, "sql": m.read_text(encoding="utf-8")} for m in migraciones]
codigo = (raiz / "migrar.ts").read_text(encoding="utf-8")
marca = "/*__MIGRACIONES__*/ []"
assert marca in codigo, "No se encontró el marcador de migraciones en migrar.ts"
codigo = codigo.replace(marca, json.dumps(datos, ensure_ascii=False))
# Versiones fijas: Railway instala las dependencias a partir de los imports.
codigo = codigo.replace('from "pg";', 'from "pg@8.16.3";').replace('from "mysql2";', 'from "mysql2@3.14.3";')
salida = Path(args[0]) if args else raiz / "dist" / "funcion.ts"
salida.parent.mkdir(parents=True, exist_ok=True)
salida.write_text(codigo, encoding="utf-8")
print(f"{salida} ({len(codigo):,} bytes, {len(datos)} migraciones)")
