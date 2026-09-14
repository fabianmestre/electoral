import type { Usuario } from './types'

export async function restaurarSesion(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = sessionStorage,
  request: typeof fetch = fetch,
): Promise<Usuario | null> {
  const token = storage.getItem('electoral.auth.token')
  const refreshToken = storage.getItem('electoral.auth.refresh')
  if (!token && !refreshToken) return null
  const clear = () => {
    storage.removeItem('electoral.auth.token')
    storage.removeItem('electoral.auth.refresh')
  }
  if (token) {
    const response = await request('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) return (await response.json()).user
    if (response.status === 403) { clear(); return null }
    if (response.status !== 401) throw new Error('No se pudo verificar la sesión.')
  }
  if (!refreshToken) { clear(); return null }
  const response = await request('/api/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (response.status === 401 || response.status === 403) { clear(); return null }
  if (!response.ok) throw new Error('No se pudo renovar la sesión.')
  const data = await response.json()
  storage.setItem('electoral.auth.token', data.accessToken)
  storage.setItem('electoral.auth.refresh', data.refreshToken)
  return data.user
}
