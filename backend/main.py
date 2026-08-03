"""
Mapeador Interseccional — API.

Sirve el formulario en / y expone la API en /api/...

La API está partida en dos superficies, porque quien llena el formulario es
la persona participante y no debe poder ver ni tocar registros ajenos:

  · PÚBLICO — lo único que necesita quien responde el formulario:
      GET  /api                 estado mínimo (sin datos)
      GET  /api/salud           sonda de readiness
      POST /api/personas        envía su propio registro

  · ADMIN — todo lo que lee, modifica, borra o exporta registros:
      GET/PUT/DELETE  /api/admin/personas...
      GET             /api/admin/exportar/{csv,json}
      GET             /api/admin/estado

Todo lo administrativo vive bajo el prefijo /api/admin/ y su página en
/admin.html, para poder protegerlo por ruta (proxy de autenticación
delante de `/admin*` y `/api/admin/*`) sin tocar una línea de código.

El almacenamiento es intercambiable (ver almacenamiento.py):

  - Por defecto: archivo JSON local en datos/personas.json
  - Con la variable de entorno DATABASE_URL definida: PostgreSQL
    (ver esquema_postgres.sql y migrar_json_a_postgres.py)
"""
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
import secrets
from pathlib import Path

from almacenamiento import AlmacenJSON

BASE_DIR = Path(__file__).resolve().parent.parent   # raíz del proyecto
FRONTEND_DIR = BASE_DIR / "docs"

# "produccion" apaga la documentación interactiva de FastAPI (/docs).
ENTORNO = os.environ.get("ENTORNO", "local")

app = FastAPI(
    title="Mapeador Interseccional",
    docs_url=None if ENTORNO == "produccion" else "/docs",
    redoc_url=None,
)

# ── selección del motor de almacenamiento ──
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    from almacenamiento_postgres import AlmacenPostgres
    almacen = AlmacenPostgres(DATABASE_URL)
    DESCRIPCION_ALMACEN = "PostgreSQL"
else:
    DATOS_DIR = Path(os.environ.get("DATOS_DIR", BASE_DIR / "datos"))
    JSON_PATH = DATOS_DIR / "personas.json"
    almacen = AlmacenJSON(JSON_PATH)
    DESCRIPCION_ALMACEN = str(JSON_PATH)


# ── puerta de las rutas administrativas ──
#
# PENDIENTE (decisión de la investigadora): hoy la única cerradura es un token
# compartido opcional. Mientras ADMIN_TOKEN no esté definida, las rutas admin
# quedan ABIERTAS — que es lo correcto para el uso local, y NO para un servicio
# publicado. Antes de exponerlo hacia afuera hay que hacer una de dos cosas:
#
#   a) definir ADMIN_TOKEN en el Secret del Deployment, o
#   b) poner un proxy de autenticación delante de `/admin*` y `/api/admin/*`.
#
# Cambiar de método después no toca este archivo: solo la configuración.
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN")


def verificar_admin(x_admin_token: Optional[str] = Header(default=None)):
    if not ADMIN_TOKEN:
        return                       # sin token configurado: modo local abierto
    if not x_admin_token or not secrets.compare_digest(x_admin_token, ADMIN_TOKEN):
        raise HTTPException(status_code=401, detail="No autorizado")


admin = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(verificar_admin)],
)


class PersonaIn(BaseModel):
    nombre: Optional[str] = None
    raza: Optional[list] = []
    etnia: Optional[str] = None
    genero: Optional[list] = []
    genero_otro: Optional[str] = None
    expresion: Optional[list] = []
    lugar_origen: Optional[str] = None
    residencia: Optional[str] = None
    clase: Optional[str] = None
    sexualidad: Optional[list] = []
    sexualidad_otro: Optional[str] = None
    sexo: Optional[str] = None
    estatus_migratorio: Optional[str] = None
    discapacidad: Optional[list] = []
    discap_otro: Optional[str] = None
    edad: Optional[str] = None
    espiritualidad: Optional[list] = []
    espirit_otro: Optional[str] = None
    situacion_carceral: Optional[str] = None
    carcelaria_otro: Optional[str] = None
    tamanio_corporal: Optional[str] = None
    nivel_educativo: Optional[str] = None
    formacion_no_academica: Optional[list] = []
    noacad_otro: Optional[str] = None
    ocupacion: Optional[str] = None
    ep_lugar: Optional[str] = None
    ep_saber: Optional[str] = None
    ep_falta: Optional[str] = None
    ep_tension: Optional[str] = None


# ══════════════════════ PÚBLICO ══════════════════════
# Lo mínimo para que una persona pueda responder el formulario.
# Ninguna de estas rutas devuelve datos de nadie.

@app.get("/api")
def estado():
    """Lo consulta el formulario para saber si el servidor responde."""
    return {"status": "ok", "app": "mapeador-interseccional"}


@app.get("/api/salud")
def salud():
    """Sonda de readiness: comprueba que el almacén contesta."""
    try:
        almacen.comprobar()
    except Exception:
        raise HTTPException(status_code=503, detail="Almacén no disponible")
    return {"estado": "ok"}


@app.post("/api/personas", status_code=201)
def crear_persona(p: PersonaIn):
    """Alta de un registro. Devuelve solo el folio: nunca datos de otras personas."""
    return almacen.crear(p.model_dump())


# ══════════════════════ ADMIN ══════════════════════
# Lectura, edición, borrado y exportación de los registros.

@admin.get("/estado")
def estado_admin():
    return {
        "status": "ok",
        "almacenamiento": DESCRIPCION_ALMACEN,
        "total": len(almacen.listar()),
        "protegido": bool(ADMIN_TOKEN),
    }


@admin.get("/personas")
def listar_personas():
    return almacen.listar()


@admin.get("/personas/{pid}")
def obtener_persona(pid: int):
    p = almacen.obtener(pid)
    if p is None:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return p


@admin.put("/personas/{pid}")
def actualizar_persona(pid: int, p: PersonaIn):
    resultado = almacen.actualizar(pid, p.model_dump())
    if resultado is None:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return resultado


@admin.delete("/personas/{pid}")
def eliminar_persona(pid: int):
    if not almacen.eliminar(pid):
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"eliminado": pid}


@admin.get("/exportar/csv")
def exportar_csv():
    import csv
    import io
    personas = almacen.listar()
    output = io.StringIO()
    if personas:
        # Las listas se serializan como texto separado por " | " para que el CSV sea legible
        filas = []
        for p in personas:
            fila = {}
            for k, v in p.items():
                fila[k] = " | ".join(v) if isinstance(v, list) else v
            filas.append(fila)
        writer = csv.DictWriter(output, fieldnames=filas[0].keys())
        writer.writeheader()
        writer.writerows(filas)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=personas.csv"},
    )


@admin.get("/exportar/json")
def exportar_json():
    """Descarga todos los registros en JSON, sin importar el motor de almacenamiento."""
    import json as _json
    contenido = _json.dumps(
        {"personas": almacen.listar()}, ensure_ascii=False, indent=2
    )
    return StreamingResponse(
        iter([contenido]),
        media_type="application/json; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=personas.json"},
    )


app.include_router(admin)

# El formulario se sirve desde la raíz (y el panel en /admin.html).
# Va al final: así las rutas /api/... tienen prioridad sobre los archivos.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
