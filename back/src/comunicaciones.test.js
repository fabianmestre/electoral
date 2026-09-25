import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizarCelular, validarEnvio } from './comunicaciones.js'

test('normaliza celulares colombianos al formato 57XXXXXXXXXX', () => {
  assert.equal(normalizarCelular('+57 322 587 4350'), '573225874350')
  assert.equal(normalizarCelular('3225874350'), '573225874350')
  assert.equal(normalizarCelular('6055551234'), null)
  assert.equal(normalizarCelular(null), null)
})

test('solo acepta SMS con mensaje y destinatarios', () => {
  assert.throws(() => validarEnvio({ canal: 'WhatsApp', mensaje: 'Hola', numeros: ['3225874350'] }), /solo está habilitado el canal SMS/)
  assert.throws(() => validarEnvio({ mensaje: '   ', numeros: ['3225874350'] }), /Escribe el mensaje/)
  assert.throws(() => validarEnvio({ mensaje: 'Hola' }), /al menos un destinatario/)
  assert.equal(validarEnvio({ mensaje: ' Hola ', numeros: ['3225874350'] }).mensaje, 'Hola')
})
