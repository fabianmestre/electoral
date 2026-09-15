import { ApiError } from './api-error.js'

export function createSupabaseClient({ url, key, fetchImpl = fetch }) {
  const baseUrl = url?.trim().replace(/\/$/, '')

  async function request(path, options = {}) {
    if (!baseUrl || !key) {
      throw new ApiError(503, 'Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en back/.env.')
    }
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...options,
      headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(10000),
    })
    const text = await response.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch {
      throw new ApiError(502, 'El servicio devolvió una respuesta inválida.')
    }
    if (response.ok) return data
    if (data?.code === 'PGRST205' || data?.code === '42P01') {
      throw new ApiError(503, 'Falta crear la tabla en Supabase. Ejecuta el script SQL correspondiente.')
    }
    if (data?.code === '23505') throw new ApiError(409, 'Ya existe un registro con esos datos.')
    if (data?.code === '23503') throw new ApiError(409, 'No se puede borrar: existen registros asociados. Reasigna o elimina esos datos primero.')
    if (['23514', '23502', '22001', '22007', '22P02'].includes(data?.code)) {
      throw new ApiError(422, 'Los datos no cumplen las validaciones de la tabla.')
    }
    if (response.status === 403 || data?.code === '42501') {
      throw new ApiError(403, 'No tienes permiso para realizar esta acción.')
    }
    if (response.status === 429) throw new ApiError(429, 'Demasiados intentos. Inténtalo de nuevo más tarde.')
    if (response.status >= 500) throw new ApiError(502, 'Supabase no está disponible.')
    if (response.status === 401 || path.startsWith('/auth/')) {
      throw new ApiError(401, 'Credenciales inválidas o sesión vencida.')
    }
    throw new ApiError(400, 'La base de datos no pudo procesar la solicitud.')
  }

  async function perfil(token) {
    const headers = { Authorization: `Bearer ${token}` }
    const auth = await request('/auth/v1/user', { headers })
    const rows = await request(`/rest/v1/users?id=eq.${encodeURIComponent(auth.id)}&select=id,nombre,rol,permisos,padrino_id,activo`, { headers })
    const user = rows?.[0]
    if (!user?.activo || !['admin', 'subadmin', 'padrino', 'digitador', 'lider'].includes(user.rol)) {
      throw new ApiError(403, 'La cuenta no tiene un perfil activo.')
    }
    return {
      id: user.id, email: auth.email, nombre: user.nombre, rol: user.rol,
      permisos: user.permisos ?? [], padrinoId: user.padrino_id ?? undefined, pass: '',
    }
  }

  return { request, perfil }
}
