import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateLider, serializeLider, canManageLideres } from './lideres.js'

const input = { nombres: 'Ana', apellidos: 'Pérez', correo: ' ANA@example.com ', cedula: '12345678', padrinoId: '11111111-1111-4111-8111-111111111111' }
test('el registro del líder exige un correo válido y lo normaliza', () => {
  assert.equal(validateLider(input).correo, 'ana@example.com')
  for (const correo of [undefined, '', 'invalido']) assert.throws(() => validateLider({ ...input, correo }), { status: 422 })
})
test('el líder no administra líderes y su ficha expone la cuenta vinculada', () => {
  assert.equal(canManageLideres({ rol: 'lider', permisos: [] }), false)
  const result = serializeLider({ correo: 'ana@example.com', user_id: 'user-id' })
  assert.equal(result.correo, 'ana@example.com')
  assert.equal(result.userId, 'user-id')
})
