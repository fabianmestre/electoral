import { ApiError } from './api-error.js'

const columns = {
  simpatizanteId: 'simpatizante_id',
  fecha: 'fecha',
  categoria: 'categoria',
  descripcion: 'descripcion',
  monto: 'monto',
  estado: 'estado',
  responsable: 'responsable',
}

const requiredOnCreate = ['fecha', 'categoria', 'descripcion', 'estado', 'responsable']
const CATEGORIAS = ['Salud', 'Empleo', 'Ayudas/Mercados', 'Recursos/Dinero', 'Trámites/Asesoría', 'Obras comunitarias']
const ESTADOS = ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado']

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function validateGestion(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ApiError(400, 'Envía un objeto JSON con los datos de la gestión.')
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

    if (field === 'simpatizanteId') {
      if (value === null) { result[column] = null; continue }
      if (!isUuid(value)) { errors[field] = 'Simpatizante inválido.'; continue }
      result[column] = value
      continue
    }
    if (field === 'fecha') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
        errors[field] = 'Ingresa una fecha válida.'
      } else result[column] = value
      continue
    }
    if (field === 'categoria') {
      if (!CATEGORIAS.includes(value)) errors[field] = 'Categoría inválida.'
      else result[column] = value
      continue
    }
    if (field === 'estado') {
      if (!ESTADOS.includes(value)) errors[field] = 'Estado inválido.'
      else result[column] = value
      continue
    }
    if (field === 'monto') {
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) errors[field] = 'El monto debe ser un número mayor o igual a 0.'
      else result[column] = n
      continue
    }
    if (field === 'descripcion') {
      if (typeof value !== 'string') { errors[field] = 'Debe ser un texto.'; continue }
      const normalized = value.trim()
      if (normalized.length < 1 || normalized.length > 1000) errors[field] = 'Debe tener entre 1 y 1000 caracteres.'
      else result[column] = normalized
      continue
    }
    if (field === 'responsable') {
      if (typeof value !== 'string') { errors[field] = 'Debe ser un texto.'; continue }
      const normalized = value.trim()
      if (normalized.length < 1 || normalized.length > 150) errors[field] = 'Debe tener entre 1 y 150 caracteres.'
      else result[column] = normalized
      continue
    }
  }

  if (partial && Object.keys(input).length === 0) errors._ = 'Envía al menos un campo para actualizar.'
  if (Object.keys(errors).length) throw new ApiError(422, 'Revisa los campos de la gestión.', errors)
  return result
}

export function canManageGestiones(user) {
  return user.rol === 'admin' || user.rol === 'padrino' || user.permisos.includes('datos')
}

export function serializeGestion(row) {
  const s = row.simpatizante ?? row.simpatizantes ?? null
  return {
    id: row.id,
    simpatizanteId: row.simpatizante_id,
    fecha: row.fecha,
    categoria: row.categoria,
    descripcion: row.descripcion,
    monto: Number(row.monto) || 0,
    estado: row.estado,
    responsable: row.responsable,
    creadoPor: row.creado_por,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    simpatizante: s
      ? { id: s.id, nombres: s.nombres, apellidos: s.apellidos, cedula: s.cedula, liderId: s.lider_id, rol: s.rol ?? 'simpatizante' }
      : null,
  }
}
