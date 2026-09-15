import { ApiError } from './api-error.js'
import { validarDigitador } from './digitadores.js'

// Operaciones administrativas que requieren la service role key de Supabase (crear
// cuentas, resetear contraseñas, editar otras cuentas). Se usa EXCLUSIVAMENTE desde
// rutas ya verificadas como admin (ver requireAdmin en server.js) y nunca se expone
// esta clave ni sus respuestas crudas al cliente.

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceKey = process.env.SUPABASE_SECRET_KEY

async function adminRequest(path, options = {}) {
  if (!url || !serviceKey) throw new ApiError(503, 'Falta configurar SUPABASE_SECRET_KEY en el backend.')
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...options.headers },
    signal: AbortSignal.timeout(10000),
  })
  const text = await response.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { throw new ApiError(502, 'El servicio devolvió una respuesta inválida.') }
  if (response.ok) return data
  if (data?.code === '23503') throw new ApiError(409, 'No se pueden borrar los padrinos: tienen líderes o registros asociados. Reasigna o elimina esos datos primero.')
  if (data?.code === '23514' && /users_rol_check/i.test(data?.message || data?.details || '')) {
    throw new ApiError(503, 'El rol Gestor aún no está habilitado en Supabase. Ejecuta back/sql/021_gestores.sql y vuelve a intentarlo.')
  }
  if (data?.code === 'PGRST202' || data?.code === '42883') throw new ApiError(503,
    path.includes('crear_padrino_sin_correo') ? 'Ejecuta 015_campos_padrinos.sql en Supabase para registrar padrinos sin correo.' : 'Falta habilitar el borrado de padrinos. Ejecuta 014_borrar_padrinos.sql en Supabase.')
  if (response.status === 409 || data?.code === '23505' || /already.*registered/i.test(data?.msg || data?.message || '')) {
    throw new ApiError(409, 'Ya existe una cuenta con esos datos.')
  }
  if (response.status >= 500) throw new ApiError(502, 'Supabase no está disponible.')
  if (response.status === 401 || response.status === 403) throw new ApiError(403, 'No autorizado para esta operación administrativa.')
  throw new ApiError(400, data?.msg || data?.message || 'No se pudo completar la operación administrativa.')
}

function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function siguienteCodigoPadrino(existentes) {
  let max = 0
  for (const code of existentes) {
    const m = /^P(\d+)$/.exec(code || '')
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `P${max + 1}`
}

function emailSlug(nombre) {
  const base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '')
  return (base || 'padrino') + Math.floor(Math.random() * 900 + 100)
}

export async function listarPadrinosAdmin() {
  const rows = await adminRequest(
    '/rest/v1/users?rol=eq.padrino&select=id,nombre,cedula,sector,numero,celular,direccion,barrio,padrino_id,activo,creado_en&order=creado_en.asc',
  )
  const items = []
  for (const row of rows) {
    let email = null
    try {
      const auth = await adminRequest(`/auth/v1/admin/users/${row.id}`)
      email = auth?.email ?? auth?.user?.email ?? null
    } catch {
      // si la cuenta de auth no responde, igual mostramos el resto de los datos
    }
    items.push({
      id: row.id, nombre: row.nombre, cedula: row.cedula, sector: row.sector,
      numero: row.numero, celular: row.celular, direccion: row.direccion, barrio: row.barrio,
      padrinoId: row.padrino_id, activo: row.activo, email, creadoEn: row.creado_en,
    })
  }
  return items
}

export async function crearPadrinoAdmin({ nombre, cedula, sector, email, numero, celular, direccion, barrio }) {
  if (!email) {
    const creado = await adminRequest('/rest/v1/rpc/crear_padrino_sin_correo', {
      method: 'POST', body: JSON.stringify({ datos: { nombre, cedula, sector, numero, celular, direccion, barrio } }),
    })
    return { ...creado, email: null, password: null }
  }
  const existentes = await adminRequest('/rest/v1/users?rol=eq.padrino&select=padrino_id')
  const codigo = siguienteCodigoPadrino(existentes.map((r) => r.padrino_id))
  const password = cedula

  const auth = await adminRequest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { nombre } }),
  })
  const authId = auth?.id ?? auth?.user?.id
  if (!authId) throw new ApiError(502, 'No se pudo crear la cuenta de autenticación.')

  try {
    await adminRequest('/rest/v1/users', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: authId, nombre, cedula: cedula || null, sector: sector || null,
        numero: numero ?? null, celular: celular || null, direccion: direccion || null, barrio: barrio || null,
        rol: 'padrino', padrino_id: codigo, activo: true,
      }),
    })
  } catch (error) {
    await adminRequest(`/auth/v1/admin/users/${authId}`, { method: 'DELETE' }).catch(() => {})
    throw error
  }

  return { id: authId, nombre, cedula: cedula || null, sector: sector || null, numero: numero ?? null, celular: celular || null, direccion: direccion || null, barrio: barrio || null, padrinoId: codigo, activo: true, email, password }
}

export async function actualizarPadrinoAdmin(id, cambios) {
  const body = {}
  if ('nombre' in cambios) body.nombre = cambios.nombre
  if ('cedula' in cambios) body.cedula = cambios.cedula
  if ('sector' in cambios) body.sector = cambios.sector
  for (const field of ['numero', 'celular', 'direccion', 'barrio']) {
    if (field in cambios) body[field] = cambios[field]
  }
  if ('activo' in cambios) body.activo = cambios.activo
  if (Object.keys(body).length === 0) throw new ApiError(422, 'Envía al menos un campo para actualizar.')
  const rows = await adminRequest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&rol=eq.padrino`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body),
  })
  if (!rows?.length) throw new ApiError(404, 'Padrino no encontrado.')
  return rows[0]
}

export async function resetClavePadrinoAdmin(id) {
  const rows = await adminRequest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&rol=eq.padrino&select=id`)
  if (!rows?.length) throw new ApiError(404, 'Padrino no encontrado.')
  const password = generarPassword()
  await adminRequest(`/auth/v1/admin/users/${id}`, { method: 'PUT', body: JSON.stringify({ password }) })
  return { password }
}

export async function listarDigitadoresAdmin() {
  const rows = await adminRequest('/rest/v1/users?rol=eq.digitador&select=id,nombre,cedula,activo&order=nombre.asc')
  return Promise.all(rows.map(async (row) => {
    const auth = await adminRequest(`/auth/v1/admin/users/${row.id}`)
    return { ...row, email: auth?.email ?? auth?.user?.email ?? null }
  }))
}

export async function borrarTodosPadrinosAdmin() {
  return adminRequest('/rest/v1/rpc/borrar_todos_padrinos', { method: 'POST', body: '{}' })
}

export async function crearDigitadorAdmin(input) {
  const { nombre, email, cedula } = validarDigitador(input)
  const auth = await adminRequest('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password: cedula, email_confirm: true, user_metadata: { nombre } }),
  })
  const id = auth?.id ?? auth?.user?.id
  if (!id) throw new ApiError(502, 'No se pudo crear la cuenta de acceso.')
  try {
    await adminRequest('/rest/v1/users', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id, nombre, cedula, rol: 'digitador', activo: true }),
    })
  } catch (error) {
    await adminRequest(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }).catch(() => {})
    throw error
  }
  return { id, nombre, email, cedula, activo: true }
}

export async function actualizarDigitadorAdmin(id, input) {
  if (typeof input.activo !== 'boolean') throw new ApiError(422, 'Indica el estado de la cuenta.')
  const rows = await adminRequest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&rol=eq.digitador`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ activo: input.activo }),
  })
  if (!rows?.length) throw new ApiError(404, 'Digitador no encontrado.')
  return { id: rows[0].id, activo: rows[0].activo }
}

export async function listarGestoresAdmin() {
  const rows = await adminRequest('/rest/v1/users?rol=eq.gestor&select=id,nombre,cedula,activo&order=nombre.asc')
  return Promise.all(rows.map(async (row) => {
    const auth = await adminRequest(`/auth/v1/admin/users/${row.id}`)
    return { ...row, email: auth?.email ?? auth?.user?.email ?? null }
  }))
}

export async function crearGestorAdmin(input) {
  const { nombre, email, cedula } = validarDigitador(input)
  const auth = await adminRequest('/auth/v1/admin/users', {
    method: 'POST', body: JSON.stringify({ email, password: cedula, email_confirm: true, user_metadata: { nombre } }),
  })
  const id = auth?.id ?? auth?.user?.id
  if (!id) throw new ApiError(502, 'No se pudo crear la cuenta de acceso.')
  try {
    await adminRequest('/rest/v1/users', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id, nombre, cedula, rol: 'gestor', activo: true }),
    })
  } catch (error) {
    await adminRequest(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }).catch(() => {})
    throw error
  }
  return { id, nombre, email, cedula, activo: true }
}

export async function actualizarGestorAdmin(id, input) {
  if (typeof input.activo !== 'boolean') throw new ApiError(422, 'Indica el estado de la cuenta.')
  const rows = await adminRequest(`/rest/v1/users?id=eq.${encodeURIComponent(id)}&rol=eq.gestor`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ activo: input.activo }),
  })
  if (!rows?.length) throw new ApiError(404, 'Gestor no encontrado.')
  return { id: rows[0].id, activo: rows[0].activo }
}
