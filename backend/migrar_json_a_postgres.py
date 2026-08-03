"""
Migra los registros capturados en datos/personas.json hacia PostgreSQL.

Uso:
    1. Crea la base de datos (p. ej. `createdb mapeador`)
    2. Instala el driver:  pip install "psycopg[binary]"
    3. Ejecuta:
         set DATABASE_URL=postgresql://usuario:password@localhost:5432/mapeador
         python migrar_json_a_postgres.py

Conserva los ids y las fechas originales, y ajusta la secuencia para que los
nuevos registros continúen la numeración. Es idempotente: si un id ya existe
en la base, se omite (no se duplica ni se sobreescribe).
"""
import json
import os
import sys
from pathlib import Path

import psycopg
from psycopg.types.json import Jsonb

from almacenamiento import CAMPOS, CAMPOS_LISTA

BASE_DIR = Path(__file__).resolve().parent.parent
JSON_PATH = Path(os.environ.get("DATOS_DIR", BASE_DIR / "datos")) / "personas.json"
ESQUEMA_SQL = Path(__file__).resolve().parent / "esquema_postgres.sql"


def main():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("Define la variable de entorno DATABASE_URL antes de ejecutar la migración.")
    if not JSON_PATH.exists():
        sys.exit(f"No se encontró {JSON_PATH} — no hay nada que migrar.")

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        personas = json.load(f)["personas"]
    if not personas:
        sys.exit("El archivo JSON no tiene registros — no hay nada que migrar.")

    columnas = ", ".join(["id", "creado_en", "actualizado"] + CAMPOS)
    marcadores = ", ".join(["%s"] * (len(CAMPOS) + 3))

    migradas = 0
    omitidas = 0
    with psycopg.connect(url) as conn:
        conn.execute(ESQUEMA_SQL.read_text(encoding="utf-8"))
        for p in personas:
            valores = [p["id"], p["creado_en"], p["actualizado"]]
            for c in CAMPOS:
                v = p.get(c)
                valores.append(Jsonb(v or []) if c in CAMPOS_LISTA else v)
            fila = conn.execute(
                f"INSERT INTO personas ({columnas}) VALUES ({marcadores}) "
                f"ON CONFLICT (id) DO NOTHING RETURNING id",
                valores,
            ).fetchone()
            if fila:
                migradas += 1
            else:
                omitidas += 1
        # La secuencia continúa después del id más alto
        conn.execute(
            "SELECT setval(pg_get_serial_sequence('personas', 'id'), "
            "(SELECT COALESCE(MAX(id), 1) FROM personas))"
        )

    print(f"Migración completa: {migradas} registros migrados, {omitidas} ya existían.")
    print("Para que la app use PostgreSQL, arranca el servidor con DATABASE_URL definida.")


if __name__ == "__main__":
    main()
