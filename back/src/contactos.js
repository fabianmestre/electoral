import { ApiError } from './api-error.js'

const columns = {
  nombres: 'nombres', apellidos: 'apellidos', telefono: 'telefono',
  correo: 'correo', direccion: 'direccion', consentimientoContacto: 'consentimiento_contacto',
}
const limits = { nombres: 100, apellidos: 100, telefono: 30, correo: 254, direccion: 300 }

export function validateContact(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Envía un objeto JSON con los datos del contacto.')
  }
  const errors = {}
  const result = {}
  for (const field of Object.keys(input)) {
    if (!Object.hasOwn(columns, field)) errors[field] = 'Campo no permitido.'
  }
  for (const [field, column] of Object.entries(columns)) {
    if (!Object.hasOwn(input, field)) {
      if (!partial && ['nombres', 'apellidos', 'consentimientoContacto'].includes(field)) {
        errors[field] = 'Este campo es obligatorio.'
      }
      continue
    }
    const value = input[field]
    if (field === 'consentimientoContacto') {
      if (typeof value !== 'boolean') errors[field] = 'Debe ser true o false.'
      else result[column] = value
      continue
    }
    if (value === null && !['nombres', 'apellidos'].includes(field)) {
      result[column] = null
      continue
    }
    if (typeof value !== 'string') {
      errors[field] = 'Debe ser un texto.'
      continue
    }
    const normalized = value.trim()
    if (normalized.length > limits[field]) errors[field] = `Máximo ${limits[field]} caracteres.`
    if (['nombres', 'apellidos'].includes(field) && !normalized) errors[field] = 'Este campo es obligatorio.'
    if (field === 'correo' && normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      errors[field] = 'Ingresa un correo válido.'
    }
    if (field === 'telefono' && normalized) {
      const digits = normalized.replace(/\D/g, '')
      if (!/^\+?[\d ()-]+$/.test(normalized) || digits.length < 7 || digits.length > 15) {
        errors[field] = 'Ingresa un teléfono válido de 7 a 15 dígitos.'
      }
    }
    result[column] = field === 'correo' ? normalized.toLowerCase() || null : normalized || null
  }
  if (!partial && !result.telefono && !result.correo) {
    errors.contacto = 'Ingresa al menos un teléfono o correo.'
  }
  if (partial && Object.keys(input).length === 0) errors.contacto = 'Envía al menos un campo para actualizar.'
  if (Object.keys(errors).length) throw new ApiError(422, 'Revisa los campos del contacto.', errors)
  return result
}

export function canManageContacts(user) {
  return user.rol === 'admin' || user.rol === 'padrino' || user.permisos.includes('datos')
}

export function serializeContact(row) {
  return {
    id: row.id, nombres: row.nombres, apellidos: row.apellidos,
    telefono: row.telefono, correo: row.correo, direccion: row.direccion,
    consentimientoContacto: row.consentimiento_contacto,
    consentimientoFecha: row.consentimiento_fecha,
    creadoPor: row.creado_por, creadoEn: row.creado_en, actualizadoEn: row.actualizado_en,
  }
}
