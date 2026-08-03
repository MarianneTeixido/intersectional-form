/* ============================================================
   CONFIG.JS — constantes de la aplicación
   Aquí se define a qué servidor se conecta y cómo se agrupan
   los campos del formulario. Si agregas un eje nuevo al HTML,
   regístralo también en estas listas.
   ============================================================ */

// URL de la API.
// Si la página se sirve desde FastAPI usa el mismo origen; si se abre como
// archivo (doble clic), apunta al servidor local por defecto.
const API = (location.protocol === 'file:')
  ? 'http://localhost:8000/api'
  : '/api';

// Rutas administrativas (listar, editar, borrar, exportar). Van bajo un
// prefijo propio para poder protegerlas por ruta desde el servidor, sin
// tocar el código. Quien llena el formulario nunca las usa.
const API_ADMIN = `${API}/admin`;

// Grupos de etiquetas donde se puede elegir MÁS DE UNA opción.
const multiGroups = [
  'raza',
  'genero',
  'expresion',
  'sexualidad',
  'discapacidad',
  'espiritualidad',
  'formacion_no_academica',
];

// Grupos de etiquetas donde solo se elige UNA opción.
const singleGroups = [
  'clase',
  'sexo',
  'estatus_migratorio',
  'edad',
  'situacion_carceral',
  'tamanio_corporal',
  'nivel_educativo',
];

// Grupos que al elegir "Otro" muestran una cajita de texto libre.
// clave = id del grupo de etiquetas, valor = id del div con el input.
const otroTriggers = {
  'raza':                   'raza-otro',
  'genero':                 'genero-otro',
  'sexualidad':             'sexualidad-otro',
  'discapacidad':           'discapacidad-otro',
  'espiritualidad':         'espiritualidad-otro',
  'situacion_carceral':     'carcelaria-otro',
  'formacion_no_academica': 'formacion_no_academica-otro',
};

// Ejes de referencia que alimentan la barra de progreso y la
// cuadrícula de cobertura. NO son obligatorios: solo orientan sobre
// qué tanto del mapeo quedó cubierto.
const COV_EJES = [
  { id: 'raza',            label: 'Origen étnico-racial',  tipo: 'tags' },
  { id: 'genero',          label: 'Género autopercibido',  tipo: 'tags' },
  { id: 'clase',           label: 'Clase social',          tipo: 'tags' },
  { id: 'f-origen',        label: 'Lugar de origen',       tipo: 'input' },
  { id: 'sexualidad',      label: 'Orientación sexual',    tipo: 'tags' },
  { id: 'nivel_educativo', label: 'Nivel educativo',       tipo: 'tags' },
  { id: 'ep-lugar',        label: 'Posición epistémica',   tipo: 'textarea' },
];

// Secciones del formulario, con los campos que contiene cada una.
// Sirven para avisar —antes de guardar— cuáles quedaron sin ninguna
// respuesta. Nada de esto bloquea el envío: todo es voluntario.
const SECCIONES = [
  {
    nombre: 'Identificación',
    campos: [
      { id: 'f-nombre', tipo: 'input' },
    ],
  },
  {
    nombre: 'Ejes de primer orden',
    campos: [
      { id: 'raza',         tipo: 'tags'  },
      { id: 'genero',       tipo: 'tags'  },
      { id: 'expresion',    tipo: 'tags'  },
      { id: 'f-origen',     tipo: 'input' },
      { id: 'f-residencia', tipo: 'input' },
      { id: 'clase',        tipo: 'tags'  },
    ],
  },
  {
    nombre: 'Ejes estructurales de segundo orden',
    campos: [
      { id: 'sexualidad',         tipo: 'tags' },
      { id: 'sexo',               tipo: 'tags' },
      { id: 'estatus_migratorio', tipo: 'tags' },
      { id: 'discapacidad',       tipo: 'tags' },
      { id: 'edad',               tipo: 'tags' },
      { id: 'espiritualidad',     tipo: 'tags' },
      { id: 'situacion_carceral', tipo: 'tags' },
      { id: 'tamanio_corporal',   tipo: 'tags' },
    ],
  },
  {
    nombre: 'Formación y ocupación',
    campos: [
      { id: 'nivel_educativo',        tipo: 'tags'  },
      { id: 'formacion_no_academica', tipo: 'tags'  },
      { id: 'f-ocupacion',            tipo: 'input' },
    ],
  },
  {
    nombre: 'Posición epistémica',
    campos: [
      { id: 'ep-lugar',   tipo: 'input' },
      { id: 'ep-saber',   tipo: 'input' },
      { id: 'ep-falta',   tipo: 'input' },
      { id: 'ep-tension', tipo: 'input' },
    ],
  },
];
