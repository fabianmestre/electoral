import test from 'node:test'
import assert from 'node:assert/strict'
import { validarCapturaPlanilla } from './digitacion-planillas.js'

const base = {
  nombreCompleto: 'Ana María Pérez Gómez',
  cedula: '1065840035',
  celular: '300 123 4567',
  direccion: 'Calle 10 # 2-30',
  departamento: 'Cesar',
  municipio: 'Valledupar',
  barrio: 'Centro',
  puesto: 'Colegio Nacional',
  mesa: 12,
  liderId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  tieneVehiculo: true,
  tipoVehiculo: 'Moto',
}

test('normaliza la fila de planilla y conserva el nombre original', () => {
  assert.deepEqual(validarCapturaPlanilla(base), {
    numero_planilla: null,
    nombre_completo_original: 'Ana María Pérez Gómez',
    nombres: 'Ana María', apellidos: 'Pérez Gómez', cedula: '1065840035', fecha_nacimiento: null,
    telefono: '300 123 4567', direccion: 'Calle 10 # 2-30', departamento: 'Cesar', municipio: 'Valledupar',
    zona: null, comuna: null, corregimiento: null, barrio: 'Centro', puesto: 'Colegio Nacional', mesa: 12,
    lider_id: base.liderId, tiene_vehiculo: true, tipo_vehiculo_planilla: 'Moto', habeas_data: false,
  })
})

test('exige carro o moto únicamente cuando la persona tiene vehículo', () => {
  assert.throws(() => validarCapturaPlanilla({ ...base, tipoVehiculo: '' }), { status: 422 })
  assert.equal(validarCapturaPlanilla({ ...base, tieneVehiculo: false, tipoVehiculo: '' }).tipo_vehiculo_planilla, null)
})

test('la captura del líder no exige departamento, puesto ni mesa', () => {
  const row = validarCapturaPlanilla({ ...base, departamento: '', puesto: '', mesa: '' }, { capturaLider: true })
  assert.equal(row.departamento, null)
  assert.equal(row.puesto, null)
  assert.equal(row.mesa, null)
})
