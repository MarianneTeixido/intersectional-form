# Despliegue — Kubernetes + Cloudflare Tunnel + PostgreSQL + S3 Garage

Guía para publicar el instrumento en un servidor propio, de modo que las
personas participantes llenen el formulario desde su casa. Para el uso en
local, ver `README.md`; para el funcionamiento interno, `ARQUITECTURA.md`.

## Qué se publica y qué no

La API está partida en dos superficies (`backend/main.py`):

| Superficie | Rutas | Quién |
|---|---|---|
| **Pública** | `GET /api`, `GET /api/salud`, `POST /api/personas`, `/` (formulario) | la persona participante |
| **Admin** | `/api/admin/*`, `/admin.html` | solo la investigadora |

La página pública **no puede** listar, editar, borrar ni exportar: esas
funciones viven en `docs/admin.html` y en el prefijo `/api/admin/`. Esa
separación por prefijo es lo que permite proteger la parte administrativa
por ruta, sin volver a tocar el código.

> **Pendiente: autenticación.**
> Mientras no exista la variable `ADMIN_TOKEN`, las rutas admin están
> **abiertas** a quien conozca la URL. Hay dos formas de cerrarlas, y
> ninguna implica cambiar código:
>
> 1. **Token compartido** — define `ADMIN_TOKEN` en el Secret. El panel
>    pide la clave la primera vez y la guarda solo en esa pestaña.
> 2. **Proxy de autenticación** delante de `/admin*` y `/api/admin/*`,
>    con el método que prefieras.
>
> Cualquiera de las dos se activa solo con configuración.

## Piezas

```
Internet ──► Cloudflare ──► cloudflared (Deployment, salida)
                                  │  (dentro del cluster)
                                  ▼
                       Service mapeador :80
                                  │
                       Deployment mapeador (2 réplicas)
                       uvicorn :8000 — sirve docs/ y /api
                                  │
                                  ▼
                            PostgreSQL
                                  │
                    CronJob diario: pg_dump + GPG ──► S3 Garage
```

El cluster **no expone ningún puerto entrante**: `cloudflared` abre la
conexión hacia afuera. Por eso no hay Ingress ni LoadBalancer.

## Pasos

### 1. Base de datos

Crea la base y el usuario. El esquema (`backend/esquema_postgres.sql`) se
aplica solo la primera vez que arranca la app (`CREATE TABLE IF NOT EXISTS`),
así que no hay que correr nada a mano.

Si el Postgres va a vivir en el mismo cluster, los manifiestos están en
`k8s/postgres/` (Service + StatefulSet, disco `local-path`) y los sincroniza
ArgoCD con `argocd/postgres.yaml`. La clave no se versiona, así que va a mano
y **antes** de la primera sincronización:

```bash
kubectl create namespace mapeador
cp k8s/postgres-secret.example.yaml k8s/postgres-secret.yaml   # pon la clave
kubectl apply -n mapeador -f k8s/postgres-secret.yaml
kubectl apply -n argocd  -f argocd/postgres.yaml
```

Esa misma clave tiene que aparecer en el `DATABASE_URL` de `mapeador-config`.
Comprueba que quedó arriba:

```bash
kubectl -n mapeador exec -it postgres-0 -- psql -U mapeador -c '\l'
```

Dos cosas que trae `local-path` y conviene tener presentes: los datos viven en
un directorio de **un** nodo (el pod queda amarrado a él, y si ese nodo se
pierde se pierde la base — de ahí el respaldo del paso 5), y el volumen **no
se puede agrandar** después, así que pide de una vez el tamaño que quepa.

Si ya tienes registros capturados en local (`datos/personas.json`), migra
una sola vez, desde tu computadora y con acceso a la base:

```bash
cd backend
pip install -r requirements.txt -r requirements-postgres.txt
DATABASE_URL=postgresql://... python migrar_json_a_postgres.py
```

Conserva folios y fechas, y es idempotente: correrlo dos veces no duplica.

### 2. Imagen

```bash
docker build -t TU-REGISTRY/mapeador:0.1.0 .
docker push TU-REGISTRY/mapeador:0.1.0
```

Actualiza el campo `image:` en `k8s/02-deployment.yaml`.

### 3. Secret y manifiestos

```bash
cp k8s/01-secret.example.yaml k8s/01-secret.yaml   # pon los valores reales
kubectl apply -f k8s/01-secret.yaml
kubectl apply -f k8s/02-deployment.yaml -f k8s/03-service.yaml
```

Comprueba que quedó arriba antes de publicarlo:

```bash
kubectl port-forward svc/mapeador 8000:80
# http://localhost:8000        → formulario
# http://localhost:8000/admin.html → panel
```

### 4. Túnel

Crea el túnel en Cloudflare Zero Trust, guarda su token como Secret y
aplica `k8s/04-cloudflared.yaml` (las instrucciones exactas están en los
comentarios del archivo). En el panel del túnel, la ruta pública apunta al
Service interno:

```
mapeador.tudominio.org  →  http://mapeador.NAMESPACE.svc.cluster.local:80
```

Dos cosas que conviene configurar ahí mismo:

- **Rate limiting** sobre `POST /api/personas`, para que nadie llene la
  base con envíos automáticos. Se hace en Cloudflare; la app no lo trae.
- La protección de `/admin*` y `/api/admin/*` cuando decidas el método.

### 5. Respaldos a Garage

```bash
kubectl create secret generic mapeador-respaldo \
  --from-literal=RESPALDO_PASSPHRASE='frase-larga' \
  --from-literal=AWS_ACCESS_KEY_ID='...' \
  --from-literal=AWS_SECRET_ACCESS_KEY='...'
kubectl apply -f k8s/05-cronjob-respaldo.yaml
```

Ajusta `GARAGE_ENDPOINT` y `GARAGE_BUCKET` a tu instalación. El volcado se
cifra con GPG **dentro del pod**: al bucket solo llega el `.gpg`, y sin la
frase de paso no se puede leer. Guarda esa frase fuera del cluster.

Prueba el respaldo antes de confiar en él:

```bash
kubectl create job --from=cronjob/mapeador-respaldo respaldo-prueba
kubectl logs job/respaldo-prueba -c volcar
```

## Variables de entorno

| Variable | Para qué | Por omisión |
|---|---|---|
| `DATABASE_URL` | Activa PostgreSQL. Sin ella se usa el JSON local. | — |
| `ADMIN_TOKEN` | Cierra `/api/admin/*`. Sin ella quedan abiertas. | — |
| `ENTORNO` | `produccion` apaga `/docs` (Swagger). | `local` |
| `PG_POOL_MAX` | Conexiones del pool por réplica. | `5` |
| `DATOS_DIR` | Carpeta del JSON (solo en modo local). | `../datos` |

## Notas de operación

- **Escalar**: con PostgreSQL la app no guarda nada en disco, así que
  `replicas` se puede subir sin más. Cuida que `replicas × PG_POOL_MAX` no
  rebase el `max_connections` de tu Postgres.
- **Actualizar**: construye una imagen con etiqueta nueva y
  `kubectl set image deployment/mapeador api=TU-REGISTRY/mapeador:0.2.0`.
  El rollout es gradual y las sondas evitan cortes.
- **El visualizador** (`../interseccional-mapper/`) queda fuera de este
  despliegue por ahora. Cuando entre, hay que decidir cómo lee los datos:
  hoy espera `GET /api/personas`, que ya no existe como ruta pública.
