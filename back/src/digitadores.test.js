import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarDigitador } from './digitadores.js'
import { canManageSimpatizantes, validateSimpatizante } from './simpatizantes.js'
import { canManageLideres } from './lideres.js'
import { canManageGestiones } from './gestiones.js'

test('valida la cuenta y normaliza correo y cédula', () => {
  assert.deepEqual(validarDigitador({ nombre: ' Ana ', email: ' ANA@example.com ', cedula: ' 12345678 ' }),
    { nombre: 'Ana', email: 'ana@example.com', cedula: '12345678' })
  for (const changes of [{ email: '' }, { email: 'correo' }, { cedula: '' }, { cedula: '123' }, { nombre: '' }]) {
    assert.throws(() => validarDigitador({ nombre: 'Ana', email: 'ana@example.com', cedula: '12345678', ...changes }), { status: 422 })
  }
})
test('el digitador puede capturar fichas sin administrar líderes o gestiones', () => {
  const digitador = { rol: 'digitador', permisos: [] }
  assert.equal(canManageSimpatizantes(digitador), true)
  assert.equal(canManageLideres(digitador), false)
  assert.equal(canManageGestiones(digitador), false)
})
test('guarda y valida el código de planilla en las fichas', () => {
  assert.deepEqual(validateSimpatizante({ planillaCodigo: ' PL-001 ' }, { partial: true }), { planilla_codigo: 'PL-001' })
  assert.deepEqual(validateSimpatizante({ planillaCodigo: null }, { partial: true }), { planilla_codigo: null })
  assert.throws(() => validateSimpatizante({ planillaCodigo: 'A'.repeat(81) }, { partial: true }), { status: 422 })
})
