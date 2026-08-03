/* ============================================================
   APP.JS — el formulario que llena la persona
   Aquí viven las funciones que llaman los botones del HTML
   (onclick="...") y las que pintan resultados en pantalla.
   Los datos los pide a api.js; el formulario lo maneja formulario.js.

   Esta página es PÚBLICA: solo puede enviar un registro nuevo. No
   lista, no exporta y no borra nada — eso vive en admin.html.

   Única excepción: si la URL trae ?editar=ID, la página entra en modo
   edición para que el panel de administración reutilice este mismo
   formulario en lugar de duplicarlo. Ese modo usa rutas /api/admin/.
   Índice:
     1. Estado (registro nuevo o edición)
     2. Guardar
     3. Modal de aviso: secciones sin responder
     4. Pantalla de agradecimiento
     5. Estado del servidor
     6. Utilidades (toast, escapeHtml)
     7. Arranque
   ============================================================ */

/* ── 1. Estado ── */

// Folio del registro que se está editando; null = registro nuevo.
let currentId = null;

// Lee ?editar=ID y, si viene, carga ese registro en el formulario.
async function iniciarModoEdicion() {
  const id = new URLSearchParams(location.search).get('editar');
  if (!id) return;
  try {
    const p = await apiObtenerPersona(id);
    currentId = Number(id);
    document.getElementById('editPill').classList.add('show');
    document.getElementById('editId').textContent = '#' + id;
    setForm(p);
    toast(`Editando: ${p.nombre || 'folio ' + id}`);
  } catch (e) {
    toast(e.message === '401'
      ? 'Necesitas abrir este registro desde el panel de administración'
      : 'No se pudo cargar el registro', true);
  }
}

/* ── 2. Guardar ── */

// Ningún campo es obligatorio: si quedaron secciones enteras sin
// responder solo se avisa con el modal, y la persona decide.
function guardar() {
  const faltantes = seccionesVacias();
  if (faltantes.length) { abrirModalFaltantes(faltantes); return; }
  guardarRegistro();
}

async function guardarRegistro() {
  const data = collectForm();
  try {
    if (currentId) {
      // modo edición (desde el panel)
      await apiActualizarPersona(currentId, data);
      toast('Registro actualizado correctamente');
    } else {
      const j = await apiCrearPersona(data);
      mostrarGracias(j.id);
    }
  } catch (e) {
    toast('No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.', true);
  }
}

/* ── 3. Modal de aviso: secciones sin responder ── */

// ¿Este campo tiene algo? (etiquetas prendidas o texto escrito)
function campoLleno(campo) {
  if (campo.tipo === 'tags') {
    return document.querySelectorAll(`#${campo.id} .tag.on`).length > 0;
  }
  const el = document.getElementById(campo.id);
  return !!el && el.value.trim().length > 0;
}

// Nombres de las secciones que quedaron completamente vacías.
// Una sección con aunque sea una respuesta no se reporta.
function seccionesVacias() {
  return SECCIONES.filter(s => !s.campos.some(campoLleno)).map(s => s.nombre);
}

// Elemento que tenía el foco antes de abrir el modal, para devolvérselo.
let focoPrevio = null;

function abrirModalFaltantes(faltantes) {
  document.getElementById('modalList').innerHTML =
    faltantes.map(n => `<li>${escapeHtml(n)}</li>`).join('');
  focoPrevio = document.activeElement;
  document.getElementById('modalBg').classList.add('show');
  document.getElementById('modalCancel').focus();
  document.addEventListener('keydown', cerrarModalConEsc);
}

function cerrarModalFaltantes() {
  document.getElementById('modalBg').classList.remove('show');
  document.removeEventListener('keydown', cerrarModalConEsc);
  if (focoPrevio) focoPrevio.focus();
}

function cerrarModalConEsc(e) {
  if (e.key === 'Escape') cerrarModalFaltantes();
}

// "Sí, enviar así": guarda tal cual, con las secciones vacías.
function confirmarEnvio() {
  cerrarModalFaltantes();
  guardarRegistro();
}

/* ── 4. Pantalla de agradecimiento ── */

// Al enviar se oculta el formulario: la persona no debe quedarse viendo
// sus respuestas ni pensar que tiene que mandarlas otra vez.
function mostrarGracias(folio) {
  document.getElementById('folioGracias').textContent = '#' + folio;
  document.getElementById('mainForm').style.display = 'none';
  document.querySelector('.progress-wrap').style.display = 'none';
  document.getElementById('graciasSection').classList.add('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Recarga limpia: sirve cuando varias personas responden en la misma
// computadora, una tras otra.
function otraRespuesta() {
  location.href = location.pathname;
}

/* ── 5. Estado del servidor ── */

async function checkApi() {
  const dot = document.getElementById('apiDot');
  const txt = document.getElementById('apiText');
  if (await apiDisponible()) {
    dot.className = 'dot ok';
    txt.textContent = 'Conectado — tus respuestas se enviarán al guardar.';
  } else {
    dot.className = 'dot err';
    txt.textContent = 'Sin conexión con el servidor: por ahora no se puede enviar el formulario.';
  }
}

/* ── 6. Utilidades ── */

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

/* ── 7. Arranque ── */

initTags();
updateCoverage();
checkApi();
iniciarModoEdicion();
