import { ApiError } from './api-error.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function texto(value, campo, maximo) {
  const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!normalized) throw new ApiError(422, `Completa ${campo}.`, { [campo]: 'Este campo es obligatorio.' })
  if (normalized.length > maximo) throw new ApiError(422, `${campo} supera el máximo permitido.`)
  return normalized
}

export function validarCapturaPlanilla(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'Envía los datos de la planilla.')
  const nombreCompleto = texto(input.nombreCompleto, 'nombreCompleto', 200)
  const partes = nombreCompleto.split(' ')
  if (partes.length < 2) throw new ApiError(422, 'Ingresa nombre y apellidos completos.')
  const corte = partes.length >= 4 ? 2 : 1
  const cedula = texto(input.cedula, 'cedula', 10)
  if (!/^[0-9]{6,10}$/.test(cedula)) throw new ApiError(422, 'Ingresa una cédula válida de 6 a 10 dígitos.')
  const telefono = texto(input.celular, 'celular', 30)
  const digits = telefono.replace(/\D/g, '')
  if (!/^\+?[\d ()-]+$/.test(telefono) || digits.length < 7 || digits.length > 15) throw new ApiError(422, 'Ingresa un celular válido.')
  const numero = Number(input.numero)
  const mesa = Number(input.mesa)
  if (!Number.isInteger(numero) || numero < 1) throw new ApiError(422, 'Ingresa un número de fila válido.')
  if (!Number.isInteger(mesa) || mesa < 1) throw new ApiError(422, 'Ingresa una mesa válida.')
  if (!UUID.test(input.liderId ?? '')) throw new ApiError(422, 'Selecciona el líder al que pertenece la planilla.')
  if (typeof input.tieneVehiculo !== 'boolean') throw new ApiError(422, 'Indica si tiene vehículo.')
  const tipoVehiculo = input.tieneVehiculo ? texto(input.tipoVehiculo, 'tipoVehiculo', 10) : null
  if (tipoVehiculo && !['Carro', 'Moto'].includes(tipoVehiculo)) throw new ApiError(422, 'El vehículo debe ser Carro o Moto.')

  return {
    numero_planilla: numero,
    nombre_completo_original: nombreCompleto,
    nombres: partes.slice(0, corte).join(' '),
    apellidos: partes.slice(corte).join(' '),
    cedula,
    fecha_nacimiento: null,
    telefono,
    direccion: texto(input.direccion, 'direccion', 300),
    departamento: texto(input.departamento, 'departamento', 100),
    municipio: texto(input.municipio, 'municipio', 100),
    zona: null,
    comuna: null,
    corregimiento: null,
    barrio: texto(input.barrio, 'barrio', 150),
    puesto: texto(input.puesto, 'puesto', 150),
    mesa,
    lider_id: input.liderId,
    tiene_vehiculo: input.tieneVehiculo,
    tipo_vehiculo_planilla: tipoVehiculo,
    habeas_data: false,
  }
}
