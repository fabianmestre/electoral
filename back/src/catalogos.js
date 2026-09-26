import { ApiError } from './api-error.js'
import { adminRequest } from './admin.js'

// Catálogos maestros (028): DIVIPOLA y puestos de votación. Son datos de referencia, por
// eso se leen con la service role una vez verificada la sesión; solo el admin escribe.

let divipolaCache = null

export async function listarDivipola() {
  if (divipolaCache) return divipolaCache
  const [departamentos, municipios] = await Promise.all([
    adminRequest('/rest/v1/departamentos?select=codigo,nombre&order=nombre.asc'),
    adminRequest('/rest/v1/municipios?select=codigo,departamento_codigo,nombre&order=nombre.asc&limit=2000'),
  ])
  divipolaCache = departamentos.map((d) => ({
    codigo: d.codigo,
    nombre: d.nombre,
    municipios: municipios.filter((m) => m.departamento_codigo === d.codigo).map((m) => ({ codigo: m.codigo, nombre: m.nombre })),
  }))
  return divipolaCache
}

export function serializarPuesto(row) {
  return {
    codigo: row.codigo, nombre: row.nombre, departamento: row.departamento, municipio: row.municipio,
    zona: row.zona, comuna: row.comuna, corregimiento: row.corregimiento, barrio: row.barrio,
    direccion: row.direccion, mesas: row.mesas, activo: row.activo,
  }
}

export async function listarPuestos() {
  const rows = await adminRequest('/rest/v1/puestos_votacion?select=*&order=departamento.asc,municipio.asc,nombre.asc')
  return rows.map(serializarPuesto)
}

const texto = (v, limite) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, limite) : null)

export function validarPuesto(input, { parcial = false } = {}) {
  if (!input || typeof input !== 'object') throw new ApiError(400, 'Envía los datos del puesto.')
  const errores = {}
  const r = {}
  if (!parcial) {
    const codigo = typeof input.codigo === 'string' ? input.codigo.trim().toUpperCase().replace(/\s+/g, '') : ''
    if (!/^[A-Z0-9-]{2,20}$/.test(codigo)) errores.codigo = 'Código de 2 a 20 letras, números o guiones (ej. PV28).'
    else r.codigo = codigo
  }
  for (const [campo, limite, obligatorio] of [['nombre', 150, true], ['departamento', 100, true], ['municipio', 100, true], ['comuna', 100], ['corregimiento', 100], ['barrio', 150], ['direccion', 300]]) {
    if (parcial && !(campo in input)) continue
    const v = texto(input[campo], limite)
    if (obligatorio && !v) errores[campo] = 'Este campo es obligatorio.'
    else r[campo] = v
  }
  if (!parcial || 'zona' in input) {
    if (input.zona !== 'Urbana' && input.zona !== 'Rural') errores.zona = 'Debe ser Urbana o Rural.'
    else r.zona = input.zona
  }
  if (!parcial || 'mesas' in input) {
    const n = Number(input.mesas)
    if (!Number.isInteger(n) || n < 1 || n > 1000) errores.mesas = 'Número de mesas entre 1 y 1000.'
    else r.mesas = n
  }
  if ('activo' in input) {
    if (typeof input.activo !== 'boolean') errores.activo = 'Debe ser true o false.'
    else r.activo = input.activo
  }
  if (Object.keys(errores).length) throw new ApiError(422, 'Revisa los datos del puesto.', errores)
  return r
}

export async function crearPuesto(input) {
  const datos = validarPuesto(input)
  const [existe] = await adminRequest(`/rest/v1/puestos_votacion?codigo=eq.${encodeURIComponent(datos.codigo)}&select=codigo`)
  if (existe) throw new ApiError(409, `Ya existe un puesto con el código ${datos.codigo}.`)
  const [row] = await adminRequest('/rest/v1/puestos_votacion', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(datos),
  })
  return serializarPuesto(row)
}

export async function actualizarPuesto(codigo, input) {
  const datos = validarPuesto(input, { parcial: true })
  if (!Object.keys(datos).length) throw new ApiError(422, 'Envía al menos un campo para actualizar.')
  const rows = await adminRequest(`/rest/v1/puestos_votacion?codigo=eq.${encodeURIComponent(codigo)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...datos, actualizado_en: new Date().toISOString() }),
  })
  if (!rows?.length) throw new ApiError(404, 'Puesto no encontrado.')
  // Las fichas de ese puesto toman el departamento y municipio de votación actualizados.
  if ('departamento' in datos || 'municipio' in datos) {
    await adminRequest(`/rest/v1/simpatizantes?puesto=eq.${encodeURIComponent(codigo)}`, {
      method: 'PATCH', body: JSON.stringify({ departamento_votacion: rows[0].departamento, municipio_votacion: rows[0].municipio }),
    })
  }
  return serializarPuesto(rows[0])
}
