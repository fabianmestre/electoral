import { ApiError } from './api-error.js'

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
    '/rest/v1/users?rol=eq.padrino&select=id,nombre,cedula,sector,padrino_id,activo,creado_en&order=creado_en.asc',
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
      padrinoId: row.padrino_id, activo: row.activo, email, creadoEn: row.creado_en,
    })
  }
  return items
}

export async function crearPadrinoAdmin({ nombre, cedula, sector }) {
  const existentes = await adminRequest('/rest/v1/users?rol=eq.padrino&select=padrino_id')
  const codigo = siguienteCodigoPadrino(existentes.map((r) => r.padrino_id))
  const email = `${emailSlug(nombre)}@campana.com`
  const password = generarPassword()

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
        rol: 'padrino', padrino_id: codigo, activo: true,
      }),
    })
  } catch (error) {
    await adminRequest(`/auth/v1/admin/users/${authId}`, { method: 'DELETE' }).catch(() => {})
    throw error
  }

  return { id: authId, nombre, cedula: cedula || null, sector: sector || null, padrinoId: codigo, activo: true, email, password }
}

export async function actualizarPadrinoAdmin(id, cambios) {
  const body = {}
  if ('nombre' in cambios) body.nombre = cambios.nombre
  if ('cedula' in cambios) body.cedula = cambios.cedula
  if ('sector' in cambios) body.sector = cambios.sector
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
