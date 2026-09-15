import { ApiError } from './api-error.js'

export function validarDigitador(input) {
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const cedula = typeof input.cedula === 'string' ? input.cedula.trim() : ''
  if (!nombre || nombre.length > 100) throw new ApiError(422, 'Ingresa un nombre válido (máximo 100 caracteres).')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(422, 'Ingresa un correo válido.')
  if (!/^[0-9]{6,10}$/.test(cedula)) throw new ApiError(422, 'Ingresa una cédula válida (6 a 10 dígitos).')
  return { nombre, email, cedula }
}
