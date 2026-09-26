import { useEffect, useState } from 'react'

// Catálogos maestros del backend (migración 028): departamentos/municipios DIVIPOLA y
// puestos de votación. Se cargan una vez y se comparten entre todas las pantallas.

export interface Municipio { codigo: string; nombre: string }
export interface Departamento { codigo: string; nombre: string; municipios: Municipio[] }
export interface PuestoVotacion {
  codigo: string; nombre: string; departamento: string; municipio: string; zona: 'Urbana' | 'Rural'
  comuna: string | null; corregimiento: string | null; barrio: string | null; direccion: string | null
  mesas: number; activo: boolean
}

let divipola: Departamento[] | null = null
let puestos: PuestoVotacion[] | null = null
const suscriptores = new Set<() => void>()
const avisar = () => suscriptores.forEach((fn) => fn())

async function obtener<T>(path: string): Promise<T[]> {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}` } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo cargar el catálogo.')
  return data.items ?? []
}

export async function recargarPuestos() {
  try { puestos = await obtener<PuestoVotacion>('/api/puestos') } catch { puestos ??= [] }
  avisar()
}

async function cargarDivipola() {
  try { divipola = await obtener<Departamento>('/api/catalogos/divipola') } catch { divipola = [] }
  avisar()
}

export function useCatalogos() {
  const [, refrescar] = useState(0)
  useEffect(() => {
    const fn = () => refrescar((n) => n + 1)
    suscriptores.add(fn)
    if (!divipola) void cargarDivipola()
    if (!puestos) void recargarPuestos()
    return () => { suscriptores.delete(fn) }
  }, [])
  const deps = divipola ?? []
  return {
    departamentos: deps.map((d) => d.nombre),
    municipiosDe: (departamento: string) => deps.find((d) => d.nombre === departamento)?.municipios.map((m) => m.nombre) ?? [],
    puestos: puestos ?? [],
    cargado: divipola !== null && puestos !== null,
  }
}
