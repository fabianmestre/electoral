import assert from 'node:assert/strict'
import test from 'node:test'
import { validarPuesto } from './catalogos.js'

const puesto = { codigo: ' pv 28 ', nombre: 'I.E. Prueba', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', comuna: 'Comuna 1', mesas: 8 }

test('normaliza el código del puesto y exige los datos básicos', () => {
  assert.equal(validarPuesto(puesto).codigo, 'PV28')
  assert.throws(() => validarPuesto({ ...puesto, nombre: '' }), { status: 422 })
  assert.throws(() => validarPuesto({ ...puesto, zona: 'Centro' }), { status: 422 })
  assert.throws(() => validarPuesto({ ...puesto, mesas: 0 }), { status: 422 })
})

test('la edición parcial solo valida los campos enviados', () => {
  assert.deepEqual(validarPuesto({ mesas: 12 }, { parcial: true }), { mesas: 12 })
  assert.deepEqual(validarPuesto({ activo: false }, { parcial: true }), { activo: false })
})
