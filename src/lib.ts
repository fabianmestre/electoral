export function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const escMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
export const esc = (s: string | number | null | undefined): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => escMap[c])

export const pad = (n: number): string => String(n).padStart(2, '0')

export const fmtCOP = (n: number | undefined): string =>
  '$' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(n || 0))

export const hoyISO = (): string => new Date().toISOString().slice(0, 10)

export function fmtFecha(d?: string): string {
  if (!d) return '—'
  const f = new Date(d + 'T00:00:00')
  return f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtFechaHora(d?: string): string {
  if (!d) return '—'
  const f = new Date(d)
  return (
    f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
    ' ' +
    f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  )
}

export function diasParaCumple(fecha?: string): number {
  if (!fecha) return 999
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T00:00:00')
  const next = new Date(hoy.getFullYear(), f.getMonth(), f.getDate())
  if (next.getTime() < hoy.getTime()) next.setFullYear(hoy.getFullYear() + 1)
  return Math.round((next.getTime() - hoy.getTime()) / 86400000)
}

export function edad(fecha?: string): number | null {
  if (!fecha) return null
  const f = new Date(fecha)
  const h = new Date()
  let e = h.getFullYear() - f.getFullYear()
  const m = h.getMonth() - f.getMonth()
  if (m < 0 || (m === 0 && h.getDate() < f.getDate())) e--
  return e
}

export const uid = (prefix: string): string =>
  prefix + Math.random().toString(36).slice(2, 8).toUpperCase()
