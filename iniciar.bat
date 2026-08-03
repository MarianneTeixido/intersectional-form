@echo off
rem ── Mapeador Interseccional — arranque local ──
cd /d "%~dp0backend"

echo Verificando dependencias...
pip install -q -r requirements.txt

echo Abriendo el formulario en el navegador...
start "" http://localhost:8000

echo Iniciando servidor local (cierra esta ventana para detenerlo)...
python -m uvicorn main:app --port 8000
