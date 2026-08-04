# Mapeador Interseccional — instrumento de captura (`intersectional-form`)

Instrumento de evaluación interseccional para mapear la composición de un grupo
o comunidad a partir de ejes de identidad y posición epistémica. Basado en el
marco teórico de **Crenshaw, Hill Collins, Lugones y Puar**.

El instrumento registra, para cada persona, ejes de primer orden
(origen étnico-racial, género, clase, lugar de origen, sexualidad, educación),
ejes estructurales de segundo orden (estatus migratorio, (des)capacidad, edad,
espiritualidad, situación carcelaria, corporalidad) y una sección de **posición
epistémica** que recoge saberes situados que los campos cerrados no capturan.

> **Corre igual en tu computadora que en un servidor propio.** En local los
> registros se guardan en un archivo JSON y no sale nada a internet; para
> publicarlo (Kubernetes + túnel de Cloudflare + PostgreSQL), ver
> [`DESPLIEGUE.md`](DESPLIEGUE.md).

Son dos páginas: el **formulario** (`/`), que llena la persona participante y
solo puede enviar respuestas, y el **panel** (`/admin.html`), donde la
investigadora lista, edita, elimina y exporta.

Esta carpeta es **sólo el instrumento de captura** (formulario + API). La
visualización de los datos vive en la carpeta hermana
[`../interseccional-mapper/`](../interseccional-mapper/).

## Cómo lanzarlo en local

Necesitas **Python 3.10 o más nuevo** instalado. Nada más: no hace falta base de
datos, ni Node, ni conexión a internet.

### Opción rápida (Windows)

Haz doble clic en `iniciar.bat`. Ese archivo instala las dependencias (solo la
primera vez), arranca el servidor y abre el formulario en tu navegador.

Para detenerlo, cierra la ventana de la terminal que quedó abierta.

### Opción manual (cualquier sistema)

Desde una terminal, parada en esta carpeta (`intersectional-form`):

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

En PowerShell son exactamente los mismos tres comandos.

Después abre <http://localhost:8000> en tu navegador: el mismo servidor sirve el
formulario y la API. Para detenerlo, `Ctrl + C` en la terminal.

### Con entorno virtual 

Para no mezclar estas dependencias, crea un entorno virtual y actívalo antes de instalar:

```powershell
python -m venv .venv
.venv\Scripts\activate            # en macOS/Linux: source .venv/bin/activate
pip install -r backend\requirements.txt
cd backend
python -m uvicorn main:app --port 8000
```

### Comprobar que quedó bien

| Dirección                          | Qué deberías ver                       |
|------------------------------------|----------------------------------------|
| <http://localhost:8000>            | El formulario                          |
| <http://localhost:8000/admin.html> | El panel con los registros             |
| <http://localhost:8000/api>        | Un JSON con el estado del servidor     |
| <http://localhost:8000/docs>       | La documentación interactiva (FastAPI) |

### Si algo falla

- **`python` no se reconoce**: instala Python desde python.org marcando la
  casilla *Add Python to PATH*.
- **El puerto 8000 está ocupado**: usa otro, p. ej. `--port 8010`, y abre
  <http://localhost:8010>.
- **`pip` no encuentra `requirements.txt`**: revisa que estés parada dentro de
  `backend/` al correr `pip install -r requirements.txt`.

### Ver lo capturado en el visualizador

El visualizador (`../interseccional-mapper/`) lee `GET /api/personas`, ruta que
ya no existe: ahora es `GET /api/admin/personas`. Queda pendiente decidir cómo
se conecta; mientras tanto usa sus datos ficticios de ejemplo.

## Dónde quedan los datos

En local, todos los registros se guardan en `datos/personas.json`. Ese archivo
**no se versiona en git** (contiene datos sensibles). Para respaldarlo, basta
con copiarlo; también puedes exportar CSV o JSON desde el panel
(`/admin.html`). En el servidor, los datos viven en PostgreSQL y se respaldan
cifrados (ver `DESPLIEGUE.md`).

## Estructura

```
intersectional-form/
├── iniciar.bat                      ← arranque con doble clic (Windows)
├── docs/                            ← lo sirve el propio servidor
│   ├── index.html                   ← formulario público (solo estructura)
│   ├── admin.html                   ← panel de la investigadora
│   ├── css/style.css
│   └── js/                          ← config, api, formulario, app, admin
├── backend/
│   ├── main.py                      ← API FastAPI (público + /api/admin)
│   ├── almacenamiento.py            ← almacén JSON (por defecto)
│   ├── almacenamiento_postgres.py   ← almacén PostgreSQL (con pool)
│   ├── esquema_postgres.sql         ← esquema de la tabla en Postgres
│   ├── migrar_json_a_postgres.py    ← migra lo capturado en JSON a Postgres
│   ├── requirements.txt
│   └── requirements-postgres.txt    ← extras del modo servidor
├── datos/personas.json              ← registros en local (no se versiona)
├── Dockerfile / .dockerignore       ← imagen del servicio
├── k8s/                             ← manifiestos de Kubernetes
├── ARQUITECTURA.md                  ← funcionamiento y arquitectura a detalle
├── DESPLIEGUE.md                    ← cómo publicarlo en un servidor propio
└── README.md
```

## PostgreSQL

Basta definir la variable de entorno `DATABASE_URL` (más
`requirements-postgres.txt`) y, si hay datos capturados en JSON, correr
`backend/migrar_json_a_postgres.py`. Los pasos completos están en
`ARQUITECTURA.md` y `DESPLIEGUE.md`.

> Los datos recogidos son sensibles: el archivo de datos no se versiona y el
> instrumento debe usarse con consentimiento informado.
