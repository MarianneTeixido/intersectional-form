-- Esquema de PostgreSQL para el Mapeador Interseccional.
-- Los campos de selección múltiple se guardan como JSONB (arreglos de texto).
-- Mantener sincronizado con CAMPOS en almacenamiento.py y PersonaIn en main.py.

CREATE TABLE IF NOT EXISTS personas (
    id          SERIAL PRIMARY KEY,
    creado_en   TIMESTAMP NOT NULL,
    actualizado TIMESTAMP NOT NULL,

    -- Identificación (anónima: solo el ID que la persona se asigna)
    nombre      TEXT,

    -- Ejes de primer orden
    raza        JSONB DEFAULT '[]',   -- origen étnico-racial (múltiple)
    etnia       TEXT,                 -- pueblo/etnia si se seleccionó "Indígena / originaria"
    genero      JSONB DEFAULT '[]',   -- género autopercibido (múltiple)
    genero_otro TEXT,
    expresion   JSONB DEFAULT '[]',   -- expresión de género (múltiple)
    lugar_origen TEXT,
    residencia  TEXT,
    clase       TEXT,

    -- Ejes estructurales de segundo orden
    sexualidad      JSONB DEFAULT '[]',
    sexualidad_otro TEXT,
    sexo            TEXT,
    estatus_migratorio TEXT,
    discapacidad    JSONB DEFAULT '[]',
    discap_otro     TEXT,
    edad            TEXT,
    espiritualidad  JSONB DEFAULT '[]',
    espirit_otro    TEXT,
    situacion_carceral TEXT,
    carcelaria_otro    TEXT,
    tamanio_corporal   TEXT,

    -- Formación y ocupación
    nivel_educativo TEXT,
    formacion_no_academica JSONB DEFAULT '[]',
    noacad_otro     TEXT,
    ocupacion       TEXT,

    -- Posición epistémica
    ep_lugar   TEXT,
    ep_saber   TEXT,
    ep_falta   TEXT,
    ep_tension TEXT
);

CREATE INDEX IF NOT EXISTS idx_personas_creado_en ON personas (creado_en DESC);

-- Bases creadas antes de que existieran estos campos
ALTER TABLE personas ADD COLUMN IF NOT EXISTS etnia TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS carcelaria_otro TEXT;

-- El formulario ya no pregunta datos de contacto (el registro es anónimo).
-- La columna se conserva en las bases que ya existen para no borrar lo
-- capturado; la app dejó de escribirla. Si no hay nada que conservar:
--   ALTER TABLE personas DROP COLUMN IF EXISTS contacto;
