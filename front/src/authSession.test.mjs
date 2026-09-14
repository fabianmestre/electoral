import { test } from 'node:test'
import assert from 'node:assert/strict'
import { restaurarSesion } from './authSession.ts'

function storage(values = {}) {
  const data = new Map(Object.entries(values))
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) }
}
const keys = { 'electoral.auth.token': 'access', 'electoral.auth.refresh': 'refresh' }
const user = { id: 'user', rol: 'admin' }

test('restaura la sesión guardada al recargar', async () => {
  const store = storage(keys)
  assert.deepEqual(await restaurarSesion(store, async () => Response.json({ user })), user)
  assert.equal(store.getItem('electoral.auth.token'), 'access')
})
test('renueva un acceso vencido y guarda los nuevos tokens', async () => {
  const store = storage(keys)
  const calls = []
  const result = await restaurarSesion(store, async (url) => {
    calls.push(url)
    return url.endsWith('/me') ? new Response(null, { status: 401 }) : Response.json({ user, accessToken: 'new-access', refreshToken: 'new-refresh' })
  })
  assert.deepEqual(result, user)
  assert.deepEqual(calls, ['/api/auth/me', '/api/auth/refresh'])
  assert.equal(store.getItem('electoral.auth.refresh'), 'new-refresh')
})
test('conserva la sesión ante fallos de red y del servidor', async () => {
  for (const request of [async () => { throw new Error('offline') }, async () => new Response(null, { status: 503 })]) {
    const store = storage(keys)
    await assert.rejects(restaurarSesion(store, request))
    assert.equal(store.getItem('electoral.auth.refresh'), 'refresh')
  }
})
test('conserva los tokens si falla temporalmente la renovación', async () => {
  const store = storage(keys)
  await assert.rejects(restaurarSesion(store, async (url) => new Response(null, { status: url.endsWith('/me') ? 401 : 502 })))
  assert.equal(store.getItem('electoral.auth.refresh'), 'refresh')
})
test('vuelve al login cuando la renovación ya no es válida', async () => {
  const store = storage(keys)
  assert.equal(await restaurarSesion(store, async () => new Response(null, { status: 401 })), null)
  assert.equal(store.getItem('electoral.auth.token'), null)
  assert.equal(store.getItem('electoral.auth.refresh'), null)
})
test('sin sesión no consulta el servidor', async () => {
  assert.equal(await restaurarSesion(storage(), async () => { throw new Error('No debe llamarse') }), null)
})
