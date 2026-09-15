import { ApiError } from './api-error.js'

const columns = {
  nombres: 'nombres',
  planillaCodigo: 'planilla_codigo',
  apellidos: 'apellidos',
  cedula: 'cedula',
  fechaNacimiento: 'fecha_nacimiento',
  telefono: 'telefono',
  correo: 'correo',
  direccion: 'direccion',
  departamento: 'departamento',
  municipio: 'municipio',
  zona: 'zona',
  comuna: 'comuna',
  corregimiento: 'corregimiento',
  barrio: 'barrio',
  puesto: 'puesto',
  mesa: 'mesa',
  intereses: 'intereses',
  gruposSociales: 'grupos_sociales',
  ocupacion: 'ocupacion',
  profesion: 'profesion',
  nivelAcademico: 'nivel_academico',
  posgrado: 'posgrado',
  observacion: 'observacion',
  liderId: 'lider_id',
  nivelVoto: 'nivel_voto',
  rolDiaE: 'rol_dia_e',
  habeasData: 'habeas_data',
}

const textLimits = {
  planillaCodigo: 80,
  nombres: 100, apellidos: 100, direccion: 300, departamento: 100, municipio: 100,
  comuna: 100, corregimiento: 100, barrio: 150, puesto: 150, ocupacion: 100,
  profesion: 100, observacion: 1000,
}

const requiredOnCreate = [
  'nombres', 'apellidos', 'cedula', 'fechaNacimiento', 'telefono',
  'departamento', 'municipio', 'zona', 'barrio', 'puesto', 'mesa', 'liderId', 'habeasData',
]

const NIVELES_ACADEMICOS = ['Sin estudios', 'Primaria', 'Bachiller', 'Técnico', 'Tecnólogo', 'Profesional']
const POSGRADOS = ['Ninguno', 'Especialización', 'Maestría', 'Doctorado']
const NIVELES_VOTO = ['Firme', 'Indeciso', 'En Riesgo']
const ROLES_DIA_E = ['Votante', 'Conductor', 'Testigo electoral']
const TIPOS_VEHICULO = ['Moto', 'Automóvil', 'Camioneta', 'Bus']
const ESTADOS_VEHICULO = ['Disponible', 'En ruta', 'Completado']
const MAX_VEHICULOS = 20

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function validateSimpatizante(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Envía un objeto JSON con los datos del simpatizante.')
  }
  const errors = {}
  const result = {}

  for (const field of Object.keys(input)) {
    if (field !== 'vehiculos' && !Object.hasOwn(columns, field)) errors[field] = 'Campo no permitido.'
  }

  for (const [field, column] of Object.entries(columns)) {
    const present = Object.hasOwn(input, field)
    if (!present) {
      if (!partial && requiredOnCreate.includes(field)) errors[field] = 'Este campo es obligatorio.'
      continue
    }
    const value = input[field]

    if (field === 'habeasData') {
      if (value !== true) errors[field] = 'Debes autorizar el tratamiento de datos (Habeas Data).'
      else result[column] = true
      continue
    }
    if (field === 'mesa') {
      const n = Number(value)
      if (!Number.isInteger(n) || n <= 0) errors[field] = 'Ingresa un número de mesa válido.'
      else result[column] = n
      continue
    }
    if (field === 'intereses' || field === 'gruposSociales') {
      if (!Array.isArray(value) || !value.every((v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 60)) {
        errors[field] = 'Debe ser una lista de textos.'
      } else result[column] = value.map((v) => v.trim())
      continue
    }
    if (field === 'zona') {
      if (value !== 'Urbana' && value !== 'Rural') errors[field] = 'Debe ser Urbana o Rural.'
      else result[column] = value
      continue
    }
    if (field === 'nivelAcademico') {
      if (!NIVELES_ACADEMICOS.includes(value)) errors[field] = 'Nivel académico inválido.'
      else result[column] = value
      continue
    }
    if (field === 'posgrado') {
      if (!POSGRADOS.includes(value)) errors[field] = 'Posgrado inválido.'
      else result[column] = value
      continue
    }
    if (field === 'nivelVoto') {
      if (!NIVELES_VOTO.includes(value)) errors[field] = 'Nivel de voto inválido.'
      else result[column] = value
      continue
    }
    if (field === 'rolDiaE') {
      if (!ROLES_DIA_E.includes(value)) errors[field] = 'Rol Día E inválido.'
      else result[column] = value
      continue
    }
    if (field === 'liderId') {
      if (!isUuid(value)) errors[field] = 'Selecciona un líder válido.'
      else result[column] = value
      continue
    }
    if (field === 'fechaNacimiento') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || value > new Date().toISOString().slice(0, 10)) {
        errors[field] = 'Ingresa una fecha de nacimiento válida.'
      } else result[column] = value
      continue
    }
    if (field === 'cedula') {
      if (typeof value !== 'string' || !/^[0-9]{6,10}$/.test(value.trim())) errors[field] = 'Ingresa una cédula válida (6 a 10 dígitos).'
      else result[column] = value.trim()
      continue
    }

    // Campos de texto libre (algunos opcionales)
    const nullable = ['correo', 'direccion', 'comuna', 'corregimiento', 'ocupacion', 'profesion', 'observacion', 'planillaCodigo']
    if (value === null && nullable.includes(field)) {
      result[column] = null
      continue
    }
    if (typeof value !== 'string') {
      errors[field] = 'Debe ser un texto.'
      continue
    }
    const normalized = value.trim()
    const limit = textLimits[field]
    if (limit && normalized.length > limit) errors[field] = `Máximo ${limit} caracteres.`
    if (requiredOnCreate.includes(field) && !normalized) errors[field] = 'Este campo es obligatorio.'
    if (field === 'correo' && normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      errors[field] = 'Ingresa un correo válido.'
    }
    if (field === 'telefono' && normalized) {
      const digits = normalized.replace(/\D/g, '')
      if (!/^\+?[\d ()-]+$/.test(normalized) || digits.length < 7 || digits.length > 15) {
        errors[field] = 'Ingresa un teléfono válido de 7 a 15 dígitos.'
      }
    }
    result[column] = normalized || (nullable.includes(field) ? null : normalized)
  }

  if (Object.hasOwn(result, 'zona')) {
    if (result.zona === 'Urbana' && !result.comuna) errors.comuna = 'Selecciona una comuna.'
    if (result.zona === 'Rural' && !result.corregimiento) errors.corregimiento = 'Selecciona un corregimiento.'
    if (result.zona === 'Urbana') result.corregimiento = null
    if (result.zona === 'Rural') result.comuna = null
  }

  if (partial && Object.keys(input).length === 0) errors._ = 'Envía al menos un campo para actualizar.'
  if (Object.keys(errors).length) throw new ApiError(422, 'Revisa los campos de la ficha.', errors)
  return result
}

export function validateVehiculos(input) {
  if (input === undefined) return undefined
  if (!Array.isArray(input)) throw new ApiError(422, 'Los vehículos deben enviarse como una lista.', { vehiculos: 'Debe ser una lista.' })
  if (input.length > MAX_VEHICULOS) throw new ApiError(422, 'Demasiados vehículos.', { vehiculos: `Máximo ${MAX_VEHICULOS} vehículos.` })
  const errors = []
  const rows = input.map((v, i) => {
    const rowErrors = {}
    if (!v || typeof v !== 'object') rowErrors.tipo = 'Vehículo inválido.'
    if (!TIPOS_VEHICULO.includes(v?.tipo)) rowErrors.tipo = 'Tipo de vehículo inválido.'
    const cap = Number(v?.capacidadPasajeros)
    if (!Number.isInteger(cap) || cap < 1 || cap > 60) rowErrors.capacidadPasajeros = 'Capacidad inválida (1 a 60).'
    if (typeof v?.aDisposicion !== 'boolean') rowErrors.aDisposicion = 'Debe ser true o false.'
    const estado = v?.estado ?? 'Disponible'
    if (!ESTADOS_VEHICULO.includes(estado)) rowErrors.estado = 'Estado de vehículo inválido.'
    if (Object.keys(rowErrors).length) errors[i] = rowErrors
    return { tipo: v?.tipo, capacidad_pasajeros: cap, a_disposicion: v?.aDisposicion, estado }
  })
  if (errors.length) throw new ApiError(422, 'Revisa los vehículos registrados.', { vehiculos: errors })
  return rows
}

export function canManageSimpatizantes(user) {
  return user.rol === 'admin' || user.rol === 'padrino' || user.rol === 'digitador' || user.rol === 'lider' || user.permisos.includes('datos')
}

export function serializeVehiculo(row) {
  return {
    id: row.id,
    tipo: row.tipo,
    capacidadPasajeros: row.capacidad_pasajeros,
    aDisposicion: row.a_disposicion,
    estado: row.estado,
  }
}

export function serializeSimpatizante(row) {
  return {
    numeroPlanilla: row.numero_planilla ?? null,
    nombreCompletoOriginal: row.nombre_completo_original ?? null,
    tieneVehiculo: row.tiene_vehiculo ?? null,
    tipoVehiculoPlanilla: row.tipo_vehiculo_planilla ?? null,
    trazabilidad: row.trazabilidad ?? null,
    planillaCodigo: row.planilla_codigo ?? null,
    id: row.id,
    nombres: row.nombres,
    apellidos: row.apellidos,
    cedula: row.cedula,
    fechaNacimiento: row.fecha_nacimiento,
    telefono: row.telefono,
    correo: row.correo,
    direccion: row.direccion,
    departamento: row.departamento,
    municipio: row.municipio,
    zona: row.zona,
    comuna: row.comuna,
    corregimiento: row.corregimiento,
    barrio: row.barrio,
    puesto: row.puesto,
    mesa: row.mesa,
    intereses: row.intereses ?? [],
    gruposSociales: row.grupos_sociales ?? [],
    ocupacion: row.ocupacion,
    profesion: row.profesion,
    nivelAcademico: row.nivel_academico,
    posgrado: row.posgrado,
    observacion: row.observacion,
    liderId: row.lider_id,
    nivelVoto: row.nivel_voto,
    rolDiaE: row.rol_dia_e,
    habeasData: row.habeas_data,
    habeasDataFecha: row.habeas_data_fecha,
    votoRegistrado: row.voto_registrado,
    votoHora: row.voto_hora,
    vehiculos: Array.isArray(row.simpatizante_vehiculos) ? row.simpatizante_vehiculos.map(serializeVehiculo) : [],
    creadoPor: row.creado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  }
}
