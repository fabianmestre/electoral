import { ApiError } from './api-error.js'

const columns = {
  nombres: 'nombres',
  apellidos: 'apellidos',
  cedula: 'cedula',
  correo: 'correo',
  meta: 'meta',
  territorio: 'territorio',
  rolDiaE: 'rol_dia_e',
  padrinoId: 'padrino_id',
  activo: 'activo',
}

const requiredOnCreate = ['nombres', 'apellidos', 'cedula', 'correo', 'padrinoId']
const ROLES_DIA_E = ['Votante', 'Conductor', 'Testigo electoral']

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function validateLider(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Envía un objeto JSON con los datos del líder.')
  }
  const errors = {}
  const result = {}

  for (const field of Object.keys(input)) {
    if (!Object.hasOwn(columns, field)) errors[field] = 'Campo no permitido.'
  }

  for (const [field, column] of Object.entries(columns)) {
    if (!Object.hasOwn(input, field)) {
      if (!partial && requiredOnCreate.includes(field)) errors[field] = 'Este campo es obligatorio.'
      continue
    }
    const value = input[field]
    if (field === 'correo') {
      if (typeof value !== 'string' || value.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) errors[field] = 'Ingresa un correo válido.'
      else result[column] = value.trim().toLowerCase()
      continue
    }

    if (field === 'meta') {
      const n = Number(value)
      if (!Number.isInteger(n) || n < 0) errors[field] = 'La meta debe ser un número entero mayor o igual a 0.'
      else result[column] = n
      continue
    }
    if (field === 'activo') {
      if (typeof value !== 'boolean') errors[field] = 'Debe ser true o false.'
      else result[column] = value
      continue
    }
    if (field === 'rolDiaE') {
      if (!ROLES_DIA_E.includes(value)) errors[field] = 'Rol Día E inválido.'
      else result[column] = value
      continue
    }
    if (field === 'padrinoId') {
      if (!isUuid(value)) errors[field] = 'Selecciona un padrino válido.'
      else result[column] = value
      continue
    }
    if (field === 'cedula') {
      if (typeof value !== 'string' || !/^[0-9]{6,10}$/.test(value.trim())) {
        errors[field] = 'Ingresa una cédula válida (6 a 10 dígitos).'
      } else result[column] = value.trim()
      continue
    }
    if (field === 'territorio') {
      if (value === null) { result[column] = null; continue }
      if (typeof value !== 'string') { errors[field] = 'Debe ser un texto.'; continue }
      const normalized = value.trim()
      if (normalized.length > 200) errors[field] = 'Máximo 200 caracteres.'
      else result[column] = normalized || null
      continue
    }

    // nombres, apellidos
    if (typeof value !== 'string') { errors[field] = 'Debe ser un texto.'; continue }
    const normalized = value.trim()
    if (normalized.length < 1 || normalized.length > 100) errors[field] = 'Debe tener entre 1 y 100 caracteres.'
    else result[column] = normalized
  }

  if (partial && Object.keys(input).length === 0) errors._ = 'Envía al menos un campo para actualizar.'
  if (Object.keys(errors).length) throw new ApiError(422, 'Revisa los campos del líder.', errors)
  return result
}

export function canManageLideres(user) {
  return user.rol === 'admin' || user.rol === 'padrino'
}

export function serializeLider(row) {
  return {
    id: row.id,
    nombres: row.nombres,
    apellidos: row.apellidos,
    cedula: row.cedula,
    correo: row.correo ?? null,
    userId: row.user_id ?? null,
    meta: row.meta,
    territorio: row.territorio,
    rolDiaE: row.rol_dia_e,
    padrinoId: row.padrino_id,
    activo: row.activo,
    creadoPor: row.creado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
  }
}
