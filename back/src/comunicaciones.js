import { ApiError } from './api-error.js'
import { adminRequest } from './admin.js'

// Envío de SMS con Hablame (api103.hablame.co). Las credenciales viven solo en back/.env.
const HABLAME_URL = 'https://api103.hablame.co/api/sms/v3/send/priority'
const MAX_MENSAJE = 459 // 3 segmentos de 153 caracteres
const MAX_DESTINATARIOS = 5000
const CONCURRENCIA = 5

// Celular colombiano: 10 dígitos que empiezan por 3, con o sin indicativo 57.
export function normalizarCelular(valor) {
  const d = String(valor ?? '').replace(/\D/g, '')
  const local = d.length === 12 && d.startsWith('57') ? d.slice(2) : d
  return /^3\d{9}$/.test(local) ? `57${local}` : null
}

export function validarEnvio(input) {
  if (!input || typeof input !== 'object') throw new ApiError(400, 'Envía los datos del mensaje.')
  const canal = input.canal ?? 'SMS'
  if (canal !== 'SMS') throw new ApiError(422, 'Por ahora solo está habilitado el canal SMS.')
  const mensaje = typeof input.mensaje === 'string' ? input.mensaje.trim() : ''
  if (!mensaje) throw new ApiError(422, 'Escribe el mensaje.')
  if (mensaje.length > MAX_MENSAJE) throw new ApiError(422, `El mensaje supera ${MAX_MENSAJE} caracteres.`)
  const ids = Array.isArray(input.simpatizanteIds) ? input.simpatizanteIds : []
  const numeros = Array.isArray(input.numeros) ? input.numeros : []
  if (!ids.every((x) => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x))) throw new ApiError(422, 'Destinatarios inválidos.')
  if (!ids.length && !numeros.length) throw new ApiError(422, 'Selecciona al menos un destinatario.')
  if (ids.length + numeros.length > MAX_DESTINATARIOS) throw new ApiError(422, `Máximo ${MAX_DESTINATARIOS} destinatarios por envío.`)
  const segmento = typeof input.segmento === 'string' ? input.segmento.trim().slice(0, 500) : ''
  return { canal, mensaje, ids, numeros, segmento }
}

async function enviarSms(numero, mensaje) {
  const { HABLAME_ACCOUNT, HABLAME_APIKEY, HABLAME_TOKEN, HABLAME_SC } = process.env
  if (!HABLAME_ACCOUNT || !HABLAME_APIKEY || !HABLAME_TOKEN) throw new ApiError(503, 'Falta configurar HABLAME_* en back/.env.')
  try {
    const response = await fetch(HABLAME_URL, {
      method: 'POST',
      headers: { Account: HABLAME_ACCOUNT, ApiKey: HABLAME_APIKEY, Token: HABLAME_TOKEN, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ toNumber: numero, sms: mensaje, flash: '0', sc: HABLAME_SC || '890202', request_dlvr_rcpt: '0' }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await response.json().catch(() => null)
    // Hablame responde status "1x000" cuando acepta el mensaje.
    if (response.ok && data?.status === '1x000') return { estado: 'enviado', smsId: data.smsId ?? null }
    return { estado: 'fallido', error: data?.error_description || data?.message || data?.status || `HTTP ${response.status}` }
  } catch (error) {
    return { estado: 'fallido', error: error instanceof Error ? error.message : 'Error de red' }
  }
}

async function destinatariosDe(ids) {
  const personas = []
  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100)
    personas.push(...await adminRequest(`/rest/v1/simpatizantes?id=in.(${lote.join(',')})&select=id,nombres,apellidos,telefono`))
  }
  return personas
}

// Envía el SMS a cada destinatario con celular válido y deja el envío en el historial.
export async function enviarComunicacion(input, usuario) {
  const { canal, mensaje, ids, numeros, segmento } = validarEnvio(input)
  const personas = ids.length ? await destinatariosDe(ids) : []
  const vistos = new Set()
  const cola = []
  const omitidos = []
  for (const p of personas) {
    const numero = normalizarCelular(p.telefono)
    const nombre = `${p.nombres} ${p.apellidos}`
    if (!numero) { omitidos.push({ simpatizanteId: p.id, nombre, numero: p.telefono ?? null, estado: 'omitido', error: 'Sin celular válido' }); continue }
    if (vistos.has(numero)) { omitidos.push({ simpatizanteId: p.id, nombre, numero, estado: 'omitido', error: 'Número repetido en el envío' }); continue }
    vistos.add(numero)
    cola.push({ simpatizanteId: p.id, nombre, numero })
  }
  for (const n of numeros) {
    const numero = normalizarCelular(n)
    if (!numero) { omitidos.push({ simpatizanteId: null, nombre: null, numero: String(n), estado: 'omitido', error: 'Número inválido' }); continue }
    if (vistos.has(numero)) continue
    vistos.add(numero)
    cola.push({ simpatizanteId: null, nombre: null, numero })
  }
  if (!cola.length) throw new ApiError(422, 'Ningún destinatario tiene un celular válido.')

  const resultados = []
  for (let i = 0; i < cola.length; i += CONCURRENCIA) {
    const lote = cola.slice(i, i + CONCURRENCIA)
    resultados.push(...await Promise.all(lote.map(async (d) => ({ ...d, ...await enviarSms(d.numero, mensaje) }))))
  }
  const detalle = [...resultados, ...omitidos]
  const enviados = resultados.filter((r) => r.estado === 'enviado').length
  const registro = {
    canal, mensaje, segmento: segmento || null, total: detalle.length, enviados,
    fallidos: resultados.length - enviados, omitidos: omitidos.length, detalle, creado_por: usuario.id,
  }
  const [guardado] = await adminRequest('/rest/v1/comunicaciones', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(registro),
  }).catch(() => [null]) // si el historial falla, el envío ya se hizo: se informa igual
  return serializarComunicacion(guardado ?? { ...registro, id: null, creado_en: new Date().toISOString() }, usuario.nombre)
}

export function serializarComunicacion(row, autor) {
  return {
    id: row.id, canal: row.canal, mensaje: row.mensaje, segmento: row.segmento, total: row.total,
    enviados: row.enviados, fallidos: row.fallidos, omitidos: row.omitidos, detalle: row.detalle ?? [],
    creadoEn: row.creado_en, autor: autor ?? row.autor?.nombre ?? null,
  }
}

export async function listarComunicaciones() {
  const rows = await adminRequest('/rest/v1/comunicaciones?select=*,autor:users(nombre)&order=creado_en.desc&limit=200')
  return rows.map((r) => serializarComunicacion(r))
}
