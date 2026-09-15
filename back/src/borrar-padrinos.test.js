import { test } from 'node:test'
import assert from 'node:assert/strict'

test('el borrado masivo usa una operación atómica y informa referencias existentes', async (t) => {
  process.env.SUPABASE_URL = 'https://example.test'
  process.env.SUPABASE_SECRET_KEY = 'test-key'
  let calls = 0
  let blocked = false
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls++
    assert.equal(url, 'https://example.test/rest/v1/rpc/borrar_todos_padrinos')
    assert.equal(options.method, 'POST')
    return blocked ? Response.json({ code: '23503' }, { status: 409 }) : Response.json(3)
  })
  const { borrarTodosPadrinosAdmin } = await import('./admin.js')
  assert.equal(await borrarTodosPadrinosAdmin(), 3)
  assert.equal(calls, 1)
  blocked = true
  await assert.rejects(borrarTodosPadrinosAdmin(), { status: 409 })
  assert.equal(calls, 2)
})
