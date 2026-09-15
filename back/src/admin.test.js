import { test } from 'node:test'
import assert from 'node:assert/strict'

test('crea la cuenta con el correo ingresado y la cédula como contraseña', async (t) => {
  process.env.SUPABASE_URL = 'https://example.test'
  process.env.SUPABASE_SECRET_KEY = 'test-key'
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : null })
    if (url.includes('select=padrino_id')) return Response.json([{ padrino_id: 'P3' }])
    if (url.endsWith('/auth/v1/admin/users')) return Response.json({ id: 'new-user' })
    return new Response(null, { status: 204 })
  })
  const { crearPadrinoAdmin } = await import('./admin.js')
  const result = await crearPadrinoAdmin({ nombre: 'Padrino de prueba', email: 'padrino@example.test', cedula: '12345678', numero: 45, celular: '3001234567', direccion: 'Calle 1', barrio: 'Centro' })
  assert.equal(calls[1].body.email, 'padrino@example.test')
  assert.equal(calls[1].body.password, '12345678')
  assert.equal(calls[2].body.cedula, '12345678')
  assert.equal(calls[2].body.padrino_id, 'P4')
  assert.equal(calls[2].body.numero, 45)
  assert.equal(calls[2].body.celular, '3001234567')
  assert.equal(calls[2].body.direccion, 'Calle 1')
  assert.equal(calls[2].body.barrio, 'Centro')
  assert.equal(result.email, 'padrino@example.test')
  assert.equal(result.password, '12345678')
})

test('registra al padrino sin correo sin generar credenciales', async (t) => {
  process.env.SUPABASE_URL = 'https://example.test'
  process.env.SUPABASE_SECRET_KEY = 'test-key'
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://example.test/rest/v1/rpc/crear_padrino_sin_correo')
    assert.equal(JSON.parse(options.body).datos.cedula, '77094716')
    return Response.json({ id: 'no-login', nombre: 'DOLMAR RENGIFO' })
  })
  const { crearPadrinoAdmin } = await import('./admin.js')
  const result = await crearPadrinoAdmin({ nombre: 'DOLMAR RENGIFO', cedula: '77094716', email: null })
  assert.equal(result.email, null)
  assert.equal(result.password, null)
})
