# Imagen del Mapeador Interseccional (formulario + API).
# Un solo contenedor sirve las dos cosas, así que no hay CORS que configurar.
#
#   docker build -t mapeador:0.1.0 .
#   docker run -p 8000:8000 -e DATABASE_URL=postgresql://... mapeador:0.1.0
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENTORNO=produccion

WORKDIR /app

# Las dependencias primero: así el caché de capas no se invalida al tocar el código.
COPY backend/requirements.txt backend/requirements-postgres.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-postgres.txt

COPY backend/ ./backend/
COPY docs/ ./docs/

# Usuario sin privilegios (la app no necesita escribir en disco con Postgres).
RUN useradd --uid 10001 --no-create-home app && chown -R app:app /app
USER app

WORKDIR /app/backend
EXPOSE 8000

# --proxy-headers porque delante va cloudflared.
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips=*"]
