/* ============================================================
   FORMULARIO.JS — leer, escribir y limpiar el formulario
   Índice:
     1. Etiquetas seleccionables (clic, exclusividad, "otro")
     2. Cobertura y barra de progreso
     3. Leer el formulario  → collectForm()
     4. Escribir el formulario ← setForm(datos)
     5. Limpiar → clearForm()
   ============================================================ */

/* ── 1. Etiquetas seleccionables ── */

// Conecta el clic de cada etiqueta: alterna selección, respeta los
// grupos de una sola opción y muestra la cajita "otro" cuando aplica.
// Cada etiqueta se expone como botón conmutable operable con teclado
// (Enter / Espacio), según WCAG 2.1.1 y 4.1.2.
function initTags() {
  document.querySelectorAll('.tags .tag').forEach(tag => {
    tag.setAttribute('role', 'button');
    tag.setAttribute('tabindex', '0');
    tag.setAttribute('aria-pressed', 'false');
    tag.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tag.click(); }
    });
    tag.addEventListener('click', () => {
      const group = tag.parentElement.id;
      const isSingle = singleGroups.includes(group);
      if (isSingle) {
        const yaActiva = tag.classList.contains('on');
        tag.parentElement.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
        if (!yaActiva) tag.classList.add('on');
      } else {
        tag.classList.toggle('on');
      }
      const otroDiv = otroTriggers[group];
      if (otroDiv) {
        const hasOtro = [...tag.parentElement.querySelectorAll('.tag.on')]
          .some(t => t.dataset.v === '__otro__');
        document.getElementById(otroDiv).classList.toggle('show', hasOtro);
      }
      if (group === 'raza') syncEtnia();
      updateCoverage();
    });
  });
  // el progreso también reacciona a los campos de texto de referencia
  ['f-origen', 'ep-lugar'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateCoverage);
  });
}

// ¿Está seleccionada la etiqueta "Indígena / originaria"?
function indigenaActiva() {
  return [...document.querySelectorAll('#raza .tag.on')]
    .some(t => t.dataset.v === 'Indígena / originaria');
}

// El campo "Pueblo o etnia" solo se muestra cuando está seleccionada
// "Indígena / originaria"; al deseleccionar se limpia. Es opcional,
// como todos los campos del formulario.
function syncEtnia() {
  const activa = indigenaActiva();
  document.getElementById('raza-etnia').classList.toggle('show', activa);
  if (!activa) document.getElementById('f-etnia').value = '';
}

/* ── 2. Cobertura y barra de progreso ── */

function updateCoverage() {
  const grid = document.getElementById('covGrid');
  grid.innerHTML = '';
  let completos = 0;
  COV_EJES.forEach(e => {
    let filled = false;
    if (e.tipo === 'tags') {
      filled = document.querySelectorAll(`#${e.id} .tag.on`).length > 0;
    } else {
      const el = document.getElementById(e.id);
      filled = el && el.value.trim().length > 0;
    }
    if (filled) completos++;
    grid.innerHTML += `<div class="cov-item">
      <span class="cov-dot ${filled ? 'ok' : ''}"></span>
      <span>${e.label}</span>
    </div>`;
  });
  const pct = Math.round(completos / COV_EJES.length * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${completos} de ${COV_EJES.length}`;

  // estado accesible: barra de progreso y etiquetas seleccionadas
  const bar = document.querySelector('.progress-bar');
  if (bar) bar.setAttribute('aria-valuenow', completos);
  document.querySelectorAll('.tags .tag').forEach(t => {
    t.setAttribute('aria-pressed', t.classList.contains('on') ? 'true' : 'false');
  });
}

/* ── 3. Leer el formulario ── */

// Cajita de texto libre de un grupo con opción "Otro" (null si no tiene).
// Se resuelve por `otroTriggers` y no por el nombre del grupo, porque no
// todos los divs siguen el patrón `<grupo>-otro`.
function inputOtro(gid) {
  const divOtro = otroTriggers[gid];
  return divOtro ? document.querySelector(`#${divOtro} input`) : null;
}

// Valores de un grupo múltiple; si está activo "__otro__" se sustituye
// por lo escrito en su cajita de texto.
function getTagsVal(id) {
  return [...document.querySelectorAll(`#${id} .tag.on`)]
    .map(t => t.dataset.v === '__otro__'
      ? (inputOtro(id)?.value.trim() || 'otra')
      : t.dataset.v)
    .filter(Boolean);
}

// Valor de un grupo de una sola opción (o null si nada está elegido).
// Igual que en los múltiples, "__otro__" se sustituye por el texto escrito.
function getSingleVal(id) {
  const el = document.querySelector(`#${id} .tag.on`);
  if (!el) return null;
  if (el.dataset.v !== '__otro__') return el.dataset.v;
  return inputOtro(id)?.value.trim() || 'otra';
}

// Junta todo el formulario en un solo objeto listo para la API.
function collectForm() {
  return {
    nombre:      document.getElementById('f-nombre').value,
    raza:        getTagsVal('raza'),
    etnia:       indigenaActiva() ? document.getElementById('f-etnia').value : null,
    genero:      getTagsVal('genero'),
    genero_otro: document.getElementById('f-genero-otro')?.value || null,
    expresion:   getTagsVal('expresion'),
    lugar_origen: document.getElementById('f-origen').value,
    residencia:  document.getElementById('f-residencia').value,
    clase:       getSingleVal('clase'),
    sexualidad:  getTagsVal('sexualidad'),
    sexualidad_otro: document.getElementById('f-sexualidad-otro')?.value || null,
    sexo:        getSingleVal('sexo'),
    estatus_migratorio: getSingleVal('estatus_migratorio'),
    discapacidad: getTagsVal('discapacidad'),
    discap_otro: document.getElementById('f-discap-otro')?.value || null,
    edad:        getSingleVal('edad'),
    espiritualidad: getTagsVal('espiritualidad'),
    espirit_otro: document.getElementById('f-espirit-otro')?.value || null,
    situacion_carceral: getSingleVal('situacion_carceral'),
    carcelaria_otro: document.getElementById('f-carcelaria-otro')?.value || null,
    tamanio_corporal: getSingleVal('tamanio_corporal'),
    nivel_educativo: getSingleVal('nivel_educativo'),
    formacion_no_academica: getTagsVal('formacion_no_academica'),
    noacad_otro: document.getElementById('f-noacad-otro')?.value || null,
    ocupacion:   document.getElementById('f-ocupacion').value,
    ep_lugar:    document.getElementById('ep-lugar').value,
    ep_saber:    document.getElementById('ep-saber').value,
    ep_falta:    document.getElementById('ep-falta').value,
    ep_tension:  document.getElementById('ep-tension').value,
  };
}

/* ── 4. Escribir el formulario (al editar un registro) ── */

function setForm(d) {
  document.getElementById('f-nombre').value   = d.nombre || '';
  document.getElementById('f-origen').value   = d.lugar_origen || '';
  document.getElementById('f-residencia').value = d.residencia || '';
  document.getElementById('f-ocupacion').value  = d.ocupacion || '';
  document.getElementById('ep-lugar').value   = d.ep_lugar || '';
  document.getElementById('ep-saber').value   = d.ep_saber || '';
  document.getElementById('ep-falta').value   = d.ep_falta || '';
  document.getElementById('ep-tension').value = d.ep_tension || '';
  document.getElementById('f-genero-otro').value = d.genero_otro || '';
  document.getElementById('f-sexualidad-otro').value = d.sexualidad_otro || '';
  document.getElementById('f-discap-otro').value = d.discap_otro || '';
  document.getElementById('f-espirit-otro').value = d.espirit_otro || '';
  document.getElementById('f-noacad-otro').value = d.noacad_otro || '';
  document.getElementById('f-carcelaria-otro').value = d.carcelaria_otro || '';
  document.getElementById('f-etnia').value = d.etnia || '';

  // primero se apagan todas las etiquetas...
  [...multiGroups, ...singleGroups].forEach(gid => {
    document.querySelectorAll(`#${gid} .tag`).forEach(t => t.classList.remove('on'));
  });
  document.querySelectorAll('.other').forEach(o => o.classList.remove('show'));

  // ...y luego se prenden las que trae el registro
  const setTags = (gid, vals) => {
    if (!vals || !vals.length) return;
    const conocidos = [];
    document.querySelectorAll(`#${gid} .tag`).forEach(t => {
      if (t.dataset.v !== '__otro__') conocidos.push(t.dataset.v);
      if (vals.includes(t.dataset.v)) t.classList.add('on');
    });
    // los valores que no son opciones predefinidas se cargan como "otro"
    const propios = vals.filter(v => !conocidos.includes(v));
    if (propios.length) {
      const tagOtro = document.querySelector(`#${gid} .tag[data-v="__otro__"]`);
      if (tagOtro) {
        tagOtro.classList.add('on');
        const otroDiv = otroTriggers[gid];
        if (otroDiv) {
          document.getElementById(otroDiv).classList.add('show');
          const inp = document.querySelector(`#${otroDiv} input`);
          if (inp && !inp.value) inp.value = propios.join(', ');
        }
      }
    }
  };
  setTags('raza', d.raza);
  syncEtnia();
  if (indigenaActiva()) document.getElementById('f-etnia').value = d.etnia || '';
  setTags('genero', d.genero);
  setTags('expresion', d.expresion);
  setTags('sexualidad', d.sexualidad);
  setTags('discapacidad', d.discapacidad);
  setTags('espiritualidad', d.espiritualidad);
  setTags('formacion_no_academica', d.formacion_no_academica);

  // En los grupos de una opción, un valor que no corresponde a ninguna
  // etiqueta predefinida se carga en "Otra" (igual que en los múltiples).
  const setS = (gid, val) => {
    if (!val) return;
    let conocido = false;
    document.querySelectorAll(`#${gid} .tag`).forEach(t => {
      if (t.dataset.v === val) { t.classList.add('on'); conocido = true; }
    });
    if (conocido) return;
    const tagOtro = document.querySelector(`#${gid} .tag[data-v="__otro__"]`);
    const otroDiv = otroTriggers[gid];
    if (!tagOtro || !otroDiv) return;
    tagOtro.classList.add('on');
    document.getElementById(otroDiv).classList.add('show');
    const inp = inputOtro(gid);
    if (inp && !inp.value) inp.value = val;
  };
  setS('clase', d.clase); setS('sexo', d.sexo);
  setS('estatus_migratorio', d.estatus_migratorio);
  setS('edad', d.edad); setS('situacion_carceral', d.situacion_carceral);
  setS('tamanio_corporal', d.tamanio_corporal);
  setS('nivel_educativo', d.nivel_educativo);

  updateCoverage();
}

/* ── 5. Limpiar ── */

function clearForm() {
  document.querySelectorAll('input[type=text]').forEach(i => i.value = '');
  document.querySelectorAll('textarea').forEach(t => t.value = '');
  document.querySelectorAll('.tag.on').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.other').forEach(d => d.classList.remove('show'));
  updateCoverage();
}
