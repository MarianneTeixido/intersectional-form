/* ============================================================
   ADMIN.JS — panel de administración (admin.html)
   Lo usa únicamente la investigadora: listar, ver, editar, eliminar
   y exportar los registros. Todo pasa por /api/admin/ (api.js).

   La página del formulario (index.html) NO carga este archivo.
   Índice:
     1. Acceso (token, solo si el servidor lo exige)
     2. Lista de registros
     3. Acciones: editar, eliminar, exportar
     4. Utilidades y arranque
   ============================================================ */

/* ── 1. Acceso ── */

// El servidor decide si hace falta token: si responde 401, se pide aquí y
// se guarda en la pestaña. Si no lo exige, esta parte nunca aparece.
function pedirToken(mensaje = 'Clave de administración:') {
  const t = prompt(mensaje);
  if (t === null) return false;
  guardarTokenAdmin(t.trim());
  return true;
}

function cerrarSesion() {
  olvidarTokenAdmin();
  location.reload();
}

// Ejecuta una acción y, si el servidor contesta 401, pide la clave y
// reintenta una sola vez.
async function conAcceso(accion) {
  try {
    return await accion();
  } catch (e) {
    if (e.message !== '401') throw e;
    if (!pedirToken()) throw e;
    return await accion();
  }
}

/* ── 2. Lista de registros ── */

async function cargarPanel() {
  try {
    const [estado, personas] = await conAcceso(async () => [
      await apiEstadoAdmin(),
      await apiListarPersonas(),
    ]);
    pintarEstado(estado);
    pintarLista(personas);
  } catch (e) {
    document.getElementById('adminEstado').textContent =
      e.message === '401'
        ? 'Sin acceso: la clave no es correcta.'
        : 'No se pudo conectar con el servidor.';
    document.getElementById('adminEstado').className = 'server-note err-text';
  }
}

function pintarEstado(estado) {
  document.getElementById('adminEstado').innerHTML =
    `<span class="dot ok"></span><span>${estado.total} registro(s) · almacén: ` +
    `${escapeHtml(estado.almacenamiento)} · acceso: ` +
    `${estado.protegido ? 'con clave' : 'abierto (sin clave configurada)'}</span>`;
}

function pintarLista(personas) {
  const lista = document.getElementById('listaPersonas');
  lista.innerHTML = '';
  if (!personas.length) {
    lista.innerHTML = '<p class="vacio">Todavía no hay personas registradas.</p>';
    return;
  }
  personas.forEach(p => {
    const div = document.createElement('div');
    div.className = 'p-row';
    const fecha = (p.creado_en || '').slice(0, 10);
    div.innerHTML = `
      <span class="p-row-name">${escapeHtml(p.nombre) || 'Sin nombre'}</span>
      <span class="p-row-meta">#${p.id} · ${(p.raza||[]).map(escapeHtml).join(', ') || '—'}${fecha ? ' · ' + fecha : ''}</span>
      <button class="btn-xs" onclick="editarPersona(${p.id})">editar</button>
      <button class="btn-xs del" onclick="eliminarPersona(${p.id})">eliminar</button>`;
    lista.appendChild(div);
  });
}

/* ── 3. Acciones ── */

// La edición reutiliza el formulario de index.html (así no hay dos copias
// del mismo HTML); esa página detecta ?editar= y carga el registro.
function editarPersona(id) {
  location.href = `index.html?editar=${id}`;
}

async function eliminarPersona(id) {
  if (!confirm(`¿Eliminar el registro #${id}? Esta acción no se puede deshacer.`)) return;
  try {
    await conAcceso(() => apiEliminarPersona(id));
    toast('Registro eliminado');
    cargarPanel();
  } catch (e) {
    toast('No se pudo eliminar', true);
  }
}

async function exportar(formato) {
  try {
    await conAcceso(() => apiDescargarExport(formato));
  } catch (e) {
    toast('No se pudo exportar', true);
  }
}

/* ── 4. Utilidades y arranque ── */

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function toast(msg, err = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (err ? ' err' : '');
  setTimeout(() => el.className = 'toast', 3200);
}

cargarPanel();
