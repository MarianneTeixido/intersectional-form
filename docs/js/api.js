/* ============================================================
   API.JS — comunicación con el servidor
   Todas las llamadas fetch viven aquí. Ninguna función de este
   archivo toca la pantalla: solo piden y devuelven datos.
   Si el servidor responde con error, lanzan una excepción que
   atrapa quien las llamó (app.js / admin.js).

   Está partido igual que el backend:
     1. Público  — lo que usa quien llena el formulario
     2. Admin    — lo que usa el panel /admin.html
   ============================================================ */

/* ── 1. Público ── */

// ¿Está corriendo el servidor? Devuelve true/false, no lanza error.
async function apiDisponible() {
  try {
    const r = await fetch(API);
    return r.ok;
  } catch {
    return false;
  }
}

// Envía un registro nuevo; devuelve la respuesta con el folio asignado.
async function apiCrearPersona(data) {
  const r = await fetch(`${API}/personas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(r.status);
  return r.json();
}

/* ── 2. Admin ── */

// El token (si el servidor lo exige) vive solo en esta pestaña: al cerrarla
// se borra. Nunca se guarda en localStorage ni viaja en la URL.
function tokenAdmin()         { return sessionStorage.getItem('tokenAdmin') || ''; }
function guardarTokenAdmin(t) { sessionStorage.setItem('tokenAdmin', t); }
function olvidarTokenAdmin()  { sessionStorage.removeItem('tokenAdmin'); }

function cabecerasAdmin(extra = {}) {
  const t = tokenAdmin();
  return t ? { ...extra, 'X-Admin-Token': t } : extra;
}

// Envuelve fetch para las rutas admin: agrega el token y deja el código de
// estado en el mensaje del error, para que el panel reconozca el 401.
async function fetchAdmin(ruta, opciones = {}) {
  const r = await fetch(`${API_ADMIN}${ruta}`, {
    ...opciones,
    headers: cabecerasAdmin(opciones.headers),
  });
  if (!r.ok) throw new Error(r.status);
  return r;
}

// Estado del almacén y número de registros.
async function apiEstadoAdmin() {
  return (await fetchAdmin('/estado')).json();
}

// Lista de todas las personas registradas.
async function apiListarPersonas() {
  return (await fetchAdmin('/personas')).json();
}

// Una persona por su folio.
async function apiObtenerPersona(id) {
  return (await fetchAdmin(`/personas/${id}`)).json();
}

// Actualiza un registro existente.
async function apiActualizarPersona(id, data) {
  const r = await fetchAdmin(`/personas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

// Elimina un registro.
async function apiEliminarPersona(id) {
  await fetchAdmin(`/personas/${id}`, { method: 'DELETE' });
}

// Descarga una exportación ('csv' o 'json'). Va por fetch y no por
// window.open porque así puede mandar el token en la cabecera; el archivo
// se arma en memoria y se dispara la descarga.
async function apiDescargarExport(formato) {
  const r = await fetchAdmin(`/exportar/${formato}`);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `personas.${formato}`;
  a.click();
  URL.revokeObjectURL(url);
}
