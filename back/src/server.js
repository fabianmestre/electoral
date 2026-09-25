import { createServer } from 'node:http'
import { ApiError } from './api-error.js'
import { createSupabaseClient } from './supabase.js'
import {
  canManageSimpatizantes,
  serializeSimpatizante,
  validateSimpatizante,
  validateVehiculos,
} from './simpatizantes.js'
import { canManageLideres, serializeLider, validateLider } from './lideres.js'
import { canManageGestiones, serializeGestion, validateGestion } from './gestiones.js'
import { canRegistrarActividad, serializeActividad, validateActividad } from './dia-e.js'
import { actualizarPadrinoAdmin, crearPadrinoAdmin, listarPadrinosAdmin, resetClavePadrinoAdmin } from './admin.js'
import { listarDigitadoresAdmin, crearDigitadorAdmin, actualizarDigitadorAdmin } from './admin.js'
import { borrarTodosPadrinosAdmin } from './admin.js'
import { actualizarGestorAdmin, crearGestorAdmin, listarGestoresAdmin } from './admin.js'
import { cambiarRolSimpatizanteAdmin } from './admin.js'
import { validarCapturaPlanilla } from './digitacion-planillas.js'

const port = Number(process.env.PORT || 3002)

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const key = process.env.SUPABASE_PUBLISHABLE_KEY

const db = createSupabaseClient({ url: process.env.SUPABASE_URL, key })

async function supabase(path, options = {}) {
  if (!url || !key) throw new ApiError(503, 'Falta configurar SUPABASE_URL en el backend.')
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new ApiError(response.status >= 500 ? 502 : 401,
    response.status >= 500 ? 'Supabase no está disponible.' : 'Credenciales inválidas o sesión vencida.')
  return response.status === 204 ? null : response.json()
}

async function perfil(token) {
  const headers = { Authorization: `Bearer ${token}` }
  const auth = await supabase('/auth/v1/user', { headers })
  const rows = await supabase(`/rest/v1/users?id=eq.${encodeURIComponent(auth.id)}&select=id,nombre,rol,permisos,padrino_id,activo`, { headers })
  const user = rows[0]
  if (!user?.activo) throw new ApiError(403, 'La cuenta no tiene un perfil activo.')
  return { id: user.id, email: auth.email, nombre: user.nombre, rol: user.rol,
    permisos: user.permisos ?? [], padrinoId: user.padrino_id ?? undefined, pass: '' }
}

async function requireUser(request) {
  const token = request.headers.authorization?.replace(/^Bearer /, '')
  if (!token) throw new ApiError(401, 'Inicia sesión.')
  const user = await perfil(token)
  return { user, token }
}

async function requireAdmin(request) {
  const result = await requireUser(request)
  if (result.user.rol !== 'admin') throw new ApiError(403, 'Solo un administrador puede realizar esta acción.')
  return result
}

async function body(request) {
  let data = ''
  for await (const chunk of request) {
    data += chunk
    if (Buffer.byteLength(data) > 65536) throw new ApiError(413, 'Solicitud demasiado grande.')
  }
  try { return JSON.parse(data) } catch { throw new ApiError(400, 'JSON inválido.') }
}

const SIMPATIZANTE_SELECT = '*,simpatizante_vehiculos(*)'

async function crearSimpatizante(request) {
  const { user, token } = await requireUser(request)
  if (user.rol === 'gestor') throw new ApiError(403, 'El gestor completa fichas existentes; no crea simpatizantes.')
  if (!canManageSimpatizantes(user)) throw new ApiError(403, 'No tienes permiso para registrar simpatizantes.')
  const payload = await body(request)
  if (user.rol === 'digitador' && (typeof payload.planillaCodigo !== 'string' || !payload.planillaCodigo.trim())) {
    throw new ApiError(422, 'Ingresa el código de la planilla que estás digitando.')
  }
  const { vehiculos, ...rest } = payload
  const columns = validateSimpatizante(rest, { partial: false })
  const vehiculoRows = validateVehiculos(vehiculos) ?? []
  const headers = { Authorization: `Bearer ${token}`, Prefer: 'return=representation' }

  const [inserted] = await db.request('/rest/v1/simpatizantes', {
    method: 'POST', headers, body: JSON.stringify(columns),
  })

  let vehiculosGuardados = []
  if (vehiculoRows.length) {
    vehiculosGuardados = await db.request('/rest/v1/simpatizante_vehiculos', {
      method: 'POST', headers,
      body: JSON.stringify(vehiculoRows.map((v) => ({ ...v, simpatizante_id: inserted.id }))),
    })
  }

  return { status: 201, data: serializeSimpatizante({ ...inserted, simpatizante_vehiculos: vehiculosGuardados }) }
}

async function crearCapturaPlanilla(request) {
  const { user, token } = await requireUser(request)
  if (!['digitador', 'lider', 'admin'].includes(user.rol)) throw new ApiError(403, 'No tienes permiso para usar la captura de planillas.')
  const payload = await body(request)
  if (user.rol === 'lider') {
    const rows = await db.request(`/rest/v1/lideres?user_id=eq.${encodeURIComponent(user.id)}&activo=is.true&select=id`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!rows?.length) throw new ApiError(403, 'Tu cuenta no tiene un líder activo asociado.')
    payload.liderId = rows[0].id
  }
  const columns = validarCapturaPlanilla(payload, { capturaLider: user.rol === 'lider' })
  const [inserted] = await db.request('/rest/v1/simpatizantes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
    body: JSON.stringify(columns),
  })
  return { status: 201, data: serializeSimpatizante({ ...inserted, simpatizante_vehiculos: [] }) }
}

async function listarSimpatizantes(request, searchParams) {
  const { token } = await requireUser(request)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 1000)
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
  const liderId = searchParams.get('liderId')
  const q = searchParams.get('q')?.trim()

  const params = new URLSearchParams()
  params.set('select', SIMPATIZANTE_SELECT)
  params.set('order', 'creado_en.desc')
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  if (liderId) params.set('lider_id', `eq.${liderId}`)
  if (q) {
    const safe = q.replace(/[,()*]/g, ' ').trim()
    if (safe) params.set('or', `(nombres.ilike.*${safe}*,apellidos.ilike.*${safe}*,cedula.ilike.*${safe}*)`)
  }

  const rows = await db.request(`/rest/v1/simpatizantes?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: 200, data: { items: rows.map(serializeSimpatizante), limit, offset } }
}

async function detalleSimpatizante(request, id) {
  const { token } = await requireUser(request)
  const rows = await db.request(`/rest/v1/simpatizantes?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SIMPATIZANTE_SELECT)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!rows?.length) throw new ApiError(404, 'Simpatizante no encontrado.')
  return { status: 200, data: serializeSimpatizante(rows[0]) }
}

async function editarSimpatizante(request, id) {
  const { user, token } = await requireUser(request)
  if (!canManageSimpatizantes(user)) throw new ApiError(403, 'No tienes permiso para editar simpatizantes.')
  const payload = await body(request)
  const { vehiculos, ...rest } = payload
  if (Object.keys(rest).length === 0 && vehiculos === undefined) {
    throw new ApiError(422, 'Envía al menos un campo para actualizar.')
  }
  const columns = Object.keys(rest).length ? validateSimpatizante(rest, { partial: true }) : {}
  const vehiculoRows = validateVehiculos(vehiculos)
  const headers = { Authorization: `Bearer ${token}`, Prefer: 'return=representation' }

  if (Object.keys(columns).length) {
    const updated = await db.request(`/rest/v1/simpatizantes?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH', headers, body: JSON.stringify(columns),
    })
    if (!updated?.length) throw new ApiError(404, 'Simpatizante no encontrado.')
  }

  if (vehiculoRows !== undefined) {
    await db.request(`/rest/v1/simpatizante_vehiculos?simpatizante_id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    if (vehiculoRows.length) {
      await db.request('/rest/v1/simpatizante_vehiculos', {
        method: 'POST', headers,
        body: JSON.stringify(vehiculoRows.map((v) => ({ ...v, simpatizante_id: id }))),
      })
    }
  }

  const rows = await db.request(`/rest/v1/simpatizantes?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SIMPATIZANTE_SELECT)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!rows?.length) throw new ApiError(404, 'Simpatizante no encontrado.')
  return { status: 200, data: serializeSimpatizante(rows[0]) }
}

async function eliminarSimpatizante(request, id) {
  const { user, token } = await requireUser(request)
  if (user.rol === 'digitador' || user.rol === 'lider' || user.rol === 'gestor') throw new ApiError(403, 'Este rol no puede eliminar simpatizantes.')
  if (!canManageSimpatizantes(user)) throw new ApiError(403, 'No tienes permiso para eliminar simpatizantes.')
  const deleted = await db.request(`/rest/v1/simpatizantes?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
  })
  if (!deleted?.length) throw new ApiError(404, 'Simpatizante no encontrado.')
  return { status: 200, data: { status: 'ok' } }
}

// Borrado masivo (limpieza de datos de prueba). Solo admin: es destructivo e irreversible.
async function eliminarTodosSimpatizantes(request) {
  const { user, token } = await requireUser(request)
  if (user.rol !== 'admin') throw new ApiError(403, 'Solo un administrador puede borrar todos los simpatizantes.')
  const deleted = await db.request('/rest/v1/simpatizantes?id=not.is.null', {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
  })
  return { status: 200, data: { status: 'ok', eliminados: deleted?.length ?? 0 } }
}

// Directorio básico de usuarios activos (id, nombre, rol) para resolver "líder asignado" en el front.
async function listarUsuarios(request) {
  const { token } = await requireUser(request)
  const rows = await db.request('/rest/v1/users?select=id,nombre,rol,padrino_id&activo=is.true&order=nombre.asc', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return {
    status: 200,
    data: { items: rows.map((r) => ({ id: r.id, nombre: r.nombre, rol: r.rol, padrinoId: r.padrino_id ?? undefined })) },
  }
}

async function crearLider(request) {
  const { user, token } = await requireUser(request)
  if (!canManageLideres(user)) throw new ApiError(403, 'No tienes permiso para registrar líderes.')
  const payload = await body(request)
  const columns = validateLider(payload, { partial: false })
  const [inserted] = await db.request('/rest/v1/lideres', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
    body: JSON.stringify(columns),
  })
  return { status: 201, data: serializeLider(inserted) }
}

async function listarLideres(request, searchParams) {
  const { token } = await requireUser(request)
  const padrinoId = searchParams.get('padrinoId')
  const params = new URLSearchParams()
  params.set('select', '*')
  params.set('order', 'nombres.asc')
  if (padrinoId) params.set('padrino_id', `eq.${padrinoId}`)
  const rows = await db.request(`/rest/v1/lideres?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: 200, data: { items: rows.map(serializeLider) } }
}

async function detalleLider(request, id) {
  const { token } = await requireUser(request)
  const rows = await db.request(`/rest/v1/lideres?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!rows?.length) throw new ApiError(404, 'Líder no encontrado.')
  return { status: 200, data: serializeLider(rows[0]) }
}

async function editarLider(request, id) {
  const { user, token } = await requireUser(request)
  if (!canManageLideres(user)) throw new ApiError(403, 'No tienes permiso para editar líderes.')
  const payload = await body(request)
  const columns = validateLider(payload, { partial: true })
  const rows = await db.request(`/rest/v1/lideres?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
    body: JSON.stringify(columns),
  })
  if (!rows?.length) throw new ApiError(404, 'Líder no encontrado.')
  return { status: 200, data: serializeLider(rows[0]) }
}

async function eliminarLider(request, id) {
  const { user, token } = await requireUser(request)
  if (!canManageLideres(user)) throw new ApiError(403, 'No tienes permiso para eliminar líderes.')
  const deleted = await db.request(`/rest/v1/lideres?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
  })
  if (!deleted?.length) throw new ApiError(404, 'Líder no encontrado.')
  return { status: 200, data: { status: 'ok' } }
}

const GESTION_SELECT = '*,simpatizante:simpatizantes(id,nombres,apellidos,cedula,lider_id)'

async function crearGestion(request) {
  const { user, token } = await requireUser(request)
  if (!canManageGestiones(user)) throw new ApiError(403, 'No tienes permiso para registrar gestiones.')
  const payload = await body(request)
  const columns = validateGestion(payload, { partial: false })
  const [inserted] = await db.request(`/rest/v1/gestiones?select=${encodeURIComponent(GESTION_SELECT)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
    body: JSON.stringify(columns),
  })
  return { status: 201, data: serializeGestion(inserted) }
}

async function listarGestiones(request, searchParams) {
  const { token } = await requireUser(request)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 500, 1), 2000)
  const params = new URLSearchParams()
  params.set('select', GESTION_SELECT)
  params.set('order', 'fecha.desc')
  params.set('limit', String(limit))
  const rows = await db.request(`/rest/v1/gestiones?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: 200, data: { items: rows.map(serializeGestion) } }
}

async function editarGestion(request, id) {
  const { user, token } = await requireUser(request)
  if (!canManageGestiones(user)) throw new ApiError(403, 'No tienes permiso para editar gestiones.')
  const payload = await body(request)
  const columns = validateGestion(payload, { partial: true })
  const rows = await db.request(`/rest/v1/gestiones?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(GESTION_SELECT)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
    body: JSON.stringify(columns),
  })
  if (!rows?.length) throw new ApiError(404, 'Gestión no encontrada.')
  return { status: 200, data: serializeGestion(rows[0]) }
}

async function eliminarGestion(request, id) {
  const { user, token } = await requireUser(request)
  if (!canManageGestiones(user)) throw new ApiError(403, 'No tienes permiso para eliminar gestiones.')
  const deleted = await db.request(`/rest/v1/gestiones?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
  })
  if (!deleted?.length) throw new ApiError(404, 'Gestión no encontrada.')
  return { status: 200, data: { status: 'ok' } }
}

// --- Día E: registro de votos y bitácora de actividad ---

const ACTIVIDAD_SELECT = '*,lider:lideres(id,nombres,apellidos)'

async function registrarVoto(request, id) {
  const { user, token } = await requireUser(request)
  if (user.rol === 'gestor') throw new ApiError(403, 'El gestor no puede registrar votos.')
  if (!canManageSimpatizantes(user)) throw new ApiError(403, 'No tienes permiso para registrar votos.')
  const headers = { Authorization: `Bearer ${token}`, Prefer: 'return=representation' }

  const existentes = await db.request(`/rest/v1/simpatizantes?id=eq.${encodeURIComponent(id)}&select=id,nombres,apellidos,lider_id,voto_registrado`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const simpatizante = existentes?.[0]
  if (!simpatizante) throw new ApiError(404, 'Simpatizante no encontrado.')
  if (simpatizante.voto_registrado) throw new ApiError(409, 'Este simpatizante ya tiene el voto registrado.')

  const [actualizado] = await db.request(`/rest/v1/simpatizantes?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(SIMPATIZANTE_SELECT)}`, {
    method: 'PATCH', headers, body: JSON.stringify({ voto_registrado: true, voto_hora: new Date().toISOString() }),
  })

  await db.request('/rest/v1/actividad_dia_e', {
    method: 'POST', headers,
    body: JSON.stringify({
      lider_id: simpatizante.lider_id,
      tipo: 'Voto',
      detalle: `Registró el voto de ${simpatizante.nombres} ${simpatizante.apellidos}`,
    }),
  }).catch(() => {}) // la bitácora es informativa: si falla, no debe tumbar el registro del voto

  return { status: 200, data: serializeSimpatizante(actualizado) }
}

async function listarActividad(request, searchParams) {
  const { token } = await requireUser(request)
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 100, 1), 500)
  const params = new URLSearchParams()
  params.set('select', ACTIVIDAD_SELECT)
  params.set('order', 'creado_en.desc')
  params.set('limit', String(limit))
  const rows = await db.request(`/rest/v1/actividad_dia_e?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: 200, data: { items: rows.map(serializeActividad) } }
}

async function crearActividad(request) {
  const { user, token } = await requireUser(request)
  if (!canRegistrarActividad(user)) throw new ApiError(403, 'No tienes permiso para registrar actividad.')
  const payload = await body(request)
  const columns = validateActividad(payload)
  const [inserted] = await db.request(`/rest/v1/actividad_dia_e?select=${encodeURIComponent(ACTIVIDAD_SELECT)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
    body: JSON.stringify(columns),
  })
  return { status: 201, data: serializeActividad(inserted) }
}

// --- Gestión de padrinos (requiere privilegios administrativos de Supabase) ---

function validarDatosPadrino(payload, { partial = false } = {}) {
  const errors = {}
  const result = {}
  for (const [field, limit] of [['celular', 30], ['direccion', 300], ['barrio', 150]]) {
    if (!(field in payload)) continue
    const value = payload[field]
    if (value === null || value === '') result[field] = null
    else if (typeof value !== 'string' || value.trim().length > limit) errors[field] = `Máximo ${limit} caracteres.`
    else if (field === 'celular' && !/^\+?[0-9 ()-]{7,30}$/.test(value.trim())) errors[field] = 'Ingresa un celular válido.'
    else result[field] = value.trim()
  }
  if ('numero' in payload) {
    if (payload.numero === null) result.numero = null
    else if (!Number.isInteger(payload.numero) || payload.numero <= 0) errors.numero = 'Ingresa un número positivo.'
    else result.numero = payload.numero
  }
  if (!partial) {
    if (payload.email === undefined || payload.email === null || payload.email === '') result.email = null
    else if (typeof payload.email !== 'string' || payload.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      errors.email = 'Ingresa un correo válido.'
    } else result.email = payload.email.trim().toLowerCase()
    if (typeof payload.cedula !== 'string' || !/^[0-9]{6,10}$/.test(payload.cedula.trim())) {
      errors.cedula = 'La cédula es obligatoria (6 a 10 dígitos) y será la contraseña inicial.'
    }
  }
  if (!partial || 'nombre' in payload) {
    if (typeof payload.nombre !== 'string' || !payload.nombre.trim() || payload.nombre.trim().length > 100) {
      errors.nombre = 'Ingresa un nombre válido (máximo 100 caracteres).'
    } else result.nombre = payload.nombre.trim()
  }
  if ('cedula' in payload) {
    if (payload.cedula === null || payload.cedula === '') result.cedula = null
    else if (typeof payload.cedula !== 'string' || !/^[0-9]{6,10}$/.test(payload.cedula.trim())) {
      errors.cedula = 'Ingresa una cédula válida (6 a 10 dígitos) o déjala vacía.'
    } else result.cedula = payload.cedula.trim()
  }
  if ('sector' in payload) {
    if (payload.sector === null || payload.sector === '') result.sector = null
    else if (typeof payload.sector !== 'string' || payload.sector.trim().length > 200) {
      errors.sector = 'Máximo 200 caracteres.'
    } else result.sector = payload.sector.trim()
  }
  if ('activo' in payload) {
    if (typeof payload.activo !== 'boolean') errors.activo = 'Debe ser true o false.'
    else result.activo = payload.activo
  }
  if (Object.keys(errors).length) throw new ApiError(422, 'Revisa los campos del padrino.', errors)
  return result
}

async function crearPadrino(request) {
  await requireAdmin(request)
  const payload = await body(request)
  const datos = validarDatosPadrino(payload, { partial: false })
  const creado = await crearPadrinoAdmin(datos)
  return {
    status: 201,
    data: {
      id: creado.id, nombre: creado.nombre, cedula: creado.cedula, sector: creado.sector,
      numero: creado.numero, celular: creado.celular, direccion: creado.direccion, barrio: creado.barrio,
      padrinoId: creado.padrinoId, activo: creado.activo, email: creado.email, password: creado.password,
    },
  }
}

async function listarPadrinos(request) {
  await requireAdmin(request)
  const rows = await listarPadrinosAdmin()
  return {
    status: 200,
    data: {
      items: rows.map((r) => ({
        id: r.id, nombre: r.nombre, cedula: r.cedula, sector: r.sector,
        numero: r.numero, celular: r.celular, direccion: r.direccion, barrio: r.barrio,
        padrinoId: r.padrinoId, activo: r.activo, email: r.email, creadoEn: r.creadoEn,
      })),
    },
  }
}

async function editarPadrino(request, id) {
  await requireAdmin(request)
  const payload = await body(request)
  const datos = validarDatosPadrino(payload, { partial: true })
  if (Object.keys(datos).length === 0) throw new ApiError(422, 'Envía al menos un campo para actualizar.')
  const actualizado = await actualizarPadrinoAdmin(id, datos)
  return {
    status: 200,
    data: {
      id: actualizado.id, nombre: actualizado.nombre, cedula: actualizado.cedula,
      sector: actualizado.sector, padrinoId: actualizado.padrino_id, activo: actualizado.activo,
    },
  }
}

async function resetClavePadrino(request, id) {
  await requireAdmin(request)
  const { password } = await resetClavePadrinoAdmin(id)
  return { status: 200, data: { password } }
}

const UUID_RE = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  const send = (status, data) => { response.writeHead(status); response.end(JSON.stringify(data)) }
  try {
    const { pathname, searchParams } = new URL(request.url, 'http://internal')

    if (request.method === 'POST' && pathname === '/api/auth/login') {
      const { email, password } = await body(request)
      if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
        throw new ApiError(400, 'Ingresa correo y contraseña.')
      }
      const auth = await supabase('/auth/v1/token?grant_type=password', {
        method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      return send(200, {
        user: await perfil(auth.access_token),
        accessToken: auth.access_token,
        refreshToken: auth.refresh_token,
      })
    }
    if (pathname === '/api/auth/refresh' && request.method === 'POST') {
      const { refreshToken } = await body(request)
      if (typeof refreshToken !== 'string' || !refreshToken) throw new ApiError(401, 'Inicia sesión.')
      const auth = await supabase('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }),
      })
      return send(200, {
        user: await perfil(auth.access_token),
        accessToken: auth.access_token,
        refreshToken: auth.refresh_token,
      })
    }
    if (pathname === '/api/auth/me' && request.method === 'GET') {
      const token = request.headers.authorization?.replace(/^Bearer /, '')
      if (!token) throw new ApiError(401, 'Inicia sesión.')
      return send(200, { user: await perfil(token) })
    }
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      const token = request.headers.authorization?.replace(/^Bearer /, '')
      if (token) await supabase('/auth/v1/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      return send(200, { status: 'ok' })
    }

    if (pathname === '/api/padrinos' && request.method === 'DELETE') {
      await requireAdmin(request)
      return send(200, { eliminados: await borrarTodosPadrinosAdmin() })
    }
    if (pathname === '/api/lideres' && request.method === 'DELETE') {
      const { token } = await requireAdmin(request)
      const deleted = await db.request('/rest/v1/lideres?id=not.is.null', {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
      })
      return send(200, { eliminados: deleted.length })
    }
    if (pathname === '/api/digitadores' && request.method === 'GET') {
      await requireAdmin(request)
      return send(200, { items: await listarDigitadoresAdmin() })
    }
    if (pathname === '/api/digitadores' && request.method === 'POST') {
      await requireAdmin(request)
      return send(201, await crearDigitadorAdmin(await body(request)))
    }
    const digitadorMatch = pathname.match(new RegExp(`^/api/digitadores/(${UUID_RE})$`))
    if (digitadorMatch && request.method === 'PATCH') {
      await requireAdmin(request)
      return send(200, await actualizarDigitadorAdmin(digitadorMatch[1], await body(request)))
    }
    if (pathname === '/api/gestores' && request.method === 'GET') {
      await requireAdmin(request)
      return send(200, { items: await listarGestoresAdmin() })
    }
    if (pathname === '/api/gestores' && request.method === 'POST') {
      await requireAdmin(request)
      return send(201, await crearGestorAdmin(await body(request)))
    }
    const gestorMatch = pathname.match(new RegExp(`^/api/gestores/(${UUID_RE})$`))
    if (gestorMatch && request.method === 'PATCH') {
      await requireAdmin(request)
      return send(200, await actualizarGestorAdmin(gestorMatch[1], await body(request)))
    }

    if (pathname === '/api/simpatizantes' && request.method === 'POST') {
      const { status, data } = await crearSimpatizante(request)
      return send(status, data)
    }
    if (pathname === '/api/digitacion/planillas' && request.method === 'POST') {
      const { status, data } = await crearCapturaPlanilla(request)
      return send(status, data)
    }
    if (pathname === '/api/simpatizantes' && request.method === 'GET') {
      const { status, data } = await listarSimpatizantes(request, searchParams)
      return send(status, data)
    }
    if (pathname === '/api/simpatizantes' && request.method === 'DELETE') {
      const { status, data } = await eliminarTodosSimpatizantes(request)
      return send(status, data)
    }
    const idMatch = pathname.match(new RegExp(`^/api/simpatizantes/(${UUID_RE})$`))
    if (idMatch && request.method === 'GET') {
      const { status, data } = await detalleSimpatizante(request, idMatch[1])
      return send(status, data)
    }
    if (idMatch && request.method === 'PATCH') {
      const { status, data } = await editarSimpatizante(request, idMatch[1])
      return send(status, data)
    }
    if (idMatch && request.method === 'DELETE') {
      const { status, data } = await eliminarSimpatizante(request, idMatch[1])
      return send(status, data)
    }
    const rolMatch = pathname.match(new RegExp(`^/api/simpatizantes/(${UUID_RE})/rol$`))
    if (rolMatch && request.method === 'PATCH') {
      await requireAdmin(request)
      const { rol } = await body(request)
      return send(200, await cambiarRolSimpatizanteAdmin(rolMatch[1], rol))
    }
    const votoMatch = pathname.match(new RegExp(`^/api/simpatizantes/(${UUID_RE})/voto$`))
    if (votoMatch && request.method === 'POST') {
      const { status, data } = await registrarVoto(request, votoMatch[1])
      return send(status, data)
    }

    if (pathname === '/api/usuarios' && request.method === 'GET') {
      const { status, data } = await listarUsuarios(request)
      return send(status, data)
    }

    if (pathname === '/api/lideres' && request.method === 'POST') {
      const { status, data } = await crearLider(request)
      return send(status, data)
    }
    if (pathname === '/api/lideres' && request.method === 'GET') {
      const { status, data } = await listarLideres(request, searchParams)
      return send(status, data)
    }
    const liderMatch = pathname.match(new RegExp(`^/api/lideres/(${UUID_RE})$`))
    if (liderMatch && request.method === 'GET') {
      const { status, data } = await detalleLider(request, liderMatch[1])
      return send(status, data)
    }
    if (liderMatch && request.method === 'PATCH') {
      const { status, data } = await editarLider(request, liderMatch[1])
      return send(status, data)
    }
    if (liderMatch && request.method === 'DELETE') {
      const { status, data } = await eliminarLider(request, liderMatch[1])
      return send(status, data)
    }

    if (pathname === '/api/gestiones' && request.method === 'POST') {
      const { status, data } = await crearGestion(request)
      return send(status, data)
    }
    if (pathname === '/api/gestiones' && request.method === 'GET') {
      const { status, data } = await listarGestiones(request, searchParams)
      return send(status, data)
    }
    const gestionMatch = pathname.match(new RegExp(`^/api/gestiones/(${UUID_RE})$`))
    if (gestionMatch && request.method === 'PATCH') {
      const { status, data } = await editarGestion(request, gestionMatch[1])
      return send(status, data)
    }
    if (gestionMatch && request.method === 'DELETE') {
      const { status, data } = await eliminarGestion(request, gestionMatch[1])
      return send(status, data)
    }

    if (pathname === '/api/actividad-dia-e' && request.method === 'GET') {
      const { status, data } = await listarActividad(request, searchParams)
      return send(status, data)
    }
    if (pathname === '/api/actividad-dia-e' && request.method === 'POST') {
      const { status, data } = await crearActividad(request)
      return send(status, data)
    }

    if (pathname === '/api/padrinos' && request.method === 'POST') {
      const { status, data } = await crearPadrino(request)
      return send(status, data)
    }
    if (pathname === '/api/padrinos' && request.method === 'GET') {
      const { status, data } = await listarPadrinos(request)
      return send(status, data)
    }
    const padrinoMatch = pathname.match(new RegExp(`^/api/padrinos/(${UUID_RE})$`))
    if (padrinoMatch && request.method === 'PATCH') {
      const { status, data } = await editarPadrino(request, padrinoMatch[1])
      return send(status, data)
    }
    const padrinoClaveMatch = pathname.match(new RegExp(`^/api/padrinos/(${UUID_RE})/clave$`))
    if (padrinoClaveMatch && request.method === 'POST') {
      const { status, data } = await resetClavePadrino(request, padrinoClaveMatch[1])
      return send(status, data)
    }

    if (request.method === 'GET' && pathname === '/api/health') {
      return send(200, { status: 'ok' })
    }

    send(404, { error: 'Ruta no encontrada' })
  } catch (error) {
    const isApiError = error instanceof ApiError
    send(isApiError ? error.status : 502, {
      error: isApiError ? error.message : 'No se pudo conectar con el servicio.',
      ...(isApiError && error.fields ? { fields: error.fields } : {}),
    })
  }
})

server.listen(port, () => {
  console.log(`Backend disponible en http://localhost:${port}`)
})
