"""
Capa de almacenamiento — implementación JSON (local).

Todas las implementaciones de almacén exponen la misma interfaz:

    listar()               -> list[dict]        (ordenadas por creado_en desc)
    obtener(pid)           -> dict | None
    crear(campos)          -> dict  {"id", "creado_en"}
    actualizar(pid, campos)-> dict | None  {"id", "actualizado"}
    eliminar(pid)          -> bool
    comprobar()            -> None   (lanza excepción si el almacén no responde;
                                      la usa la sonda /api/salud)

`campos` es el diccionario con los campos de la persona (sin id ni fechas).
Para cambiar de motor (p. ej. PostgreSQL) basta con implementar esta interfaz
y seleccionarla en main.py — los endpoints no cambian.
"""
import json
import os
import threading
from datetime import datetime
from pathlib import Path

# Orden canónico de los campos de una persona (se usa también en el CSV
# y en el esquema de PostgreSQL — mantener sincronizado con PersonaIn).
CAMPOS_LISTA = [
    "raza", "genero", "expresion", "sexualidad",
    "discapacidad", "espiritualidad", "formacion_no_academica",
]
CAMPOS_TEXTO = [
    "nombre", "etnia", "genero_otro", "lugar_origen", "residencia",
    "clase", "sexualidad_otro", "sexo", "estatus_migratorio", "discap_otro",
    "edad", "espirit_otro", "situacion_carceral", "carcelaria_otro",
    "tamanio_corporal", "nivel_educativo", "noacad_otro", "ocupacion",
    "ep_lugar", "ep_saber", "ep_falta", "ep_tension",
]
CAMPOS = CAMPOS_TEXTO + CAMPOS_LISTA


def _ahora() -> str:
    return datetime.now().isoformat(timespec="seconds")


class AlmacenJSON:
    """Guarda todos los registros en un solo archivo JSON local."""

    def __init__(self, ruta: Path):
        self.ruta = Path(ruta)
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        # Candado para que las escrituras no se pisen entre sí
        self._lock = threading.Lock()

    def _leer(self) -> dict:
        if not self.ruta.exists():
            return {"siguiente_id": 1, "personas": []}
        with open(self.ruta, "r", encoding="utf-8") as f:
            return json.load(f)

    def _escribir(self, datos: dict) -> None:
        # Escritura atómica: primero a un temporal y luego se reemplaza
        tmp = self.ruta.with_suffix(".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(datos, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.ruta)

    # ── interfaz ──

    def comprobar(self) -> None:
        """El almacén responde si su carpeta existe y el archivo es legible."""
        if not self.ruta.parent.is_dir():
            raise RuntimeError(f"No existe la carpeta {self.ruta.parent}")
        self._leer()

    def listar(self):
        datos = self._leer()
        return sorted(datos["personas"], key=lambda p: p["creado_en"], reverse=True)

    def obtener(self, pid: int):
        for p in self._leer()["personas"]:
            if p["id"] == pid:
                return p
        return None

    def crear(self, campos: dict):
        ahora = _ahora()
        with self._lock:
            datos = self._leer()
            nuevo_id = datos["siguiente_id"]
            registro = {"id": nuevo_id, "creado_en": ahora, "actualizado": ahora}
            registro.update(campos)
            datos["personas"].append(registro)
            datos["siguiente_id"] = nuevo_id + 1
            self._escribir(datos)
        return {"id": nuevo_id, "creado_en": ahora}

    def actualizar(self, pid: int, campos: dict):
        ahora = _ahora()
        with self._lock:
            datos = self._leer()
            for i, registro in enumerate(datos["personas"]):
                if registro["id"] == pid:
                    nuevo = {"id": pid, "creado_en": registro["creado_en"], "actualizado": ahora}
                    nuevo.update(campos)
                    datos["personas"][i] = nuevo
                    self._escribir(datos)
                    return {"id": pid, "actualizado": ahora}
        return None

    def eliminar(self, pid: int) -> bool:
        with self._lock:
            datos = self._leer()
            antes = len(datos["personas"])
            datos["personas"] = [p for p in datos["personas"] if p["id"] != pid]
            if len(datos["personas"]) == antes:
                return False
            # Si ya no queda ningún registro, el folio vuelve a empezar en 1
            if not datos["personas"]:
                datos["siguiente_id"] = 1
            self._escribir(datos)
        return True
