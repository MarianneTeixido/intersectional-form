"""
Capa de almacenamiento — implementación PostgreSQL.

Misma interfaz que AlmacenJSON (ver almacenamiento.py). Se activa definiendo
la variable de entorno DATABASE_URL, por ejemplo:

    DATABASE_URL=postgresql://usuario:password@localhost:5432/mapeador

Requiere psycopg 3 y su pool:
    pip install -r requirements-postgres.txt

El esquema está en esquema_postgres.sql y esta clase lo aplica sola al
arrancar (CREATE TABLE IF NOT EXISTS). Para migrar los datos ya capturados
en JSON, usa migrar_json_a_postgres.py.

Las conexiones salen de un pool: abrir una conexión nueva por petición es
caro contra una base remota y agota `max_connections` cuando corren varias
réplicas. El tamaño se ajusta con PG_POOL_MAX (5 por omisión).
"""
import json
import os
from datetime import datetime
from pathlib import Path

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import ConnectionPool

from almacenamiento import CAMPOS, CAMPOS_LISTA

ESQUEMA_SQL = Path(__file__).resolve().parent / "esquema_postgres.sql"


def _ahora() -> str:
    return datetime.now().isoformat(timespec="seconds")


class AlmacenPostgres:
    def __init__(self, database_url: str):
        self.url = database_url
        self.pool = ConnectionPool(
            database_url,
            min_size=1,
            max_size=int(os.environ.get("PG_POOL_MAX", "5")),
            kwargs={"row_factory": dict_row},
            open=True,
        )
        # Aplica el esquema si la tabla todavía no existe
        with self._conectar() as conn:
            conn.execute(ESQUEMA_SQL.read_text(encoding="utf-8"))

    def _conectar(self):
        """Presta una conexión del pool; al salir del `with` se devuelve sola."""
        return self.pool.connection()

    @staticmethod
    def _a_fila(campos: dict) -> list:
        """Convierte el dict de la API a la lista de valores en orden CAMPOS.
        Las listas se guardan como JSONB."""
        valores = []
        for c in CAMPOS:
            v = campos.get(c)
            if c in CAMPOS_LISTA:
                valores.append(Jsonb(v or []))
            else:
                valores.append(v)
        return valores

    @staticmethod
    def _a_dict(fila: dict) -> dict:
        """Normaliza una fila de la BD al mismo formato que regresa el almacén JSON."""
        d = dict(fila)
        for k in ("creado_en", "actualizado"):
            if isinstance(d.get(k), datetime):
                d[k] = d[k].isoformat(timespec="seconds")
        for c in CAMPOS_LISTA:
            v = d.get(c)
            if isinstance(v, str):
                d[c] = json.loads(v) if v else []
            elif v is None:
                d[c] = []
        return d

    # ── interfaz ──

    def comprobar(self) -> None:
        """La base responde si contesta un SELECT trivial."""
        with self._conectar() as conn:
            conn.execute("SELECT 1")

    def listar(self):
        with self._conectar() as conn:
            filas = conn.execute(
                "SELECT * FROM personas ORDER BY creado_en DESC"
            ).fetchall()
        return [self._a_dict(f) for f in filas]

    def obtener(self, pid: int):
        with self._conectar() as conn:
            fila = conn.execute(
                "SELECT * FROM personas WHERE id = %s", (pid,)
            ).fetchone()
        return self._a_dict(fila) if fila else None

    def crear(self, campos: dict):
        ahora = _ahora()
        columnas = ", ".join(CAMPOS)
        marcadores = ", ".join(["%s"] * len(CAMPOS))
        with self._conectar() as conn:
            fila = conn.execute(
                f"INSERT INTO personas (creado_en, actualizado, {columnas}) "
                f"VALUES (%s, %s, {marcadores}) RETURNING id",
                [ahora, ahora, *self._a_fila(campos)],
            ).fetchone()
        return {"id": fila["id"], "creado_en": ahora}

    def actualizar(self, pid: int, campos: dict):
        ahora = _ahora()
        asignaciones = ", ".join(f"{c} = %s" for c in CAMPOS)
        with self._conectar() as conn:
            fila = conn.execute(
                f"UPDATE personas SET actualizado = %s, {asignaciones} "
                f"WHERE id = %s RETURNING id",
                [ahora, *self._a_fila(campos), pid],
            ).fetchone()
        return {"id": pid, "actualizado": ahora} if fila else None

    def eliminar(self, pid: int) -> bool:
        with self._conectar() as conn:
            fila = conn.execute(
                "DELETE FROM personas WHERE id = %s RETURNING id", (pid,)
            ).fetchone()
            if fila is not None:
                # Si ya no queda ningún registro, el folio vuelve a empezar en 1
                resto = conn.execute("SELECT COUNT(*) AS n FROM personas").fetchone()
                if resto["n"] == 0:
                    conn.execute("ALTER SEQUENCE personas_id_seq RESTART WITH 1")
        return fila is not None
