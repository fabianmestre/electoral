import { ApiError } from './api-error.js'

const TIPOS = ['Apertura', 'Voto', 'Nota']

export function validateActividad(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Envía un objeto JSON con los datos de la actividad.')
  }
  const errors = {}
  const result = {}

  const liderId = input.liderId
  if (typeof liderId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(liderId)) {
    errors.liderId = 'Selecciona un líder válido.'
  } else result.lider_id = liderId

  if (!TIPOS.includes(input.tipo)) errors.tipo = 'Tipo de actividad inválido.'
  else result.tipo = input.tipo

  if (typeof input.detalle !== 'string' || !input.detalle.trim() || input.detalle.trim().length > 300) {
    errors.detalle = 'El detalle debe tener entre 1 y 300 caracteres.'
  } else result.detalle = input.detalle.trim()

  if (Object.keys(errors).length) throw new ApiError(422, 'Revisa los campos de la actividad.', errors)
  return result
}

export function canRegistrarActividad(user) {
  return user.rol === 'admin' || user.rol === 'padrino' || user.permisos.includes('datos')
}

export function serializeActividad(row) {
  const lider = row.lider ?? row.lideres ?? null
  return {
    id: row.id,
    liderId: row.lider_id,
    tipo: row.tipo,
    detalle: row.detalle,
    creadoPor: row.creado_por,
    creadoEn: row.creado_en,
    lider: lider ? { id: lider.id, nombres: lider.nombres, apellidos: lider.apellidos } : null,
  }
}
