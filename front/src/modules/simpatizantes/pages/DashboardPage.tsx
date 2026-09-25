import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Flag, List, Map, Megaphone, type LucideIcon } from 'lucide-react'
import { useApp, type DirectorioPreset } from '../../../store'
import Directorio from './DirectorioPage'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA, PUESTOS } from '../../../data'
import { Bars } from '../../../components/ui'
import { ROL_SIMPATIZANTE_LABEL } from '../../../types'
import type { Puesto, RolSimpatizante, SimpatizanteApi } from '../../../types'

const Card = ({ children }: { children: ReactNode }) => <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">{children}</div>

// Misma regla que la columna Validez del Directorio: residencia en el municipio de campaña.
const esValido = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA

// Los puestos cargados en BD pueden venir como "pv-06"; el catálogo usa "PV06".
const normPuesto = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '')
const PUESTO_POR_ID = new globalThis.Map<string, Puesto>(PUESTOS.map((p) => [normPuesto(p.id), p]))
const puestoDe = (p: SimpatizanteApi) => (p.puesto ? PUESTO_POR_ID.get(normPuesto(p.puesto)) : undefined)

const camposFaltantes = (p: SimpatizanteApi) => {
  const faltan: string[] = []
  if (!p.telefono?.trim()) faltan.push('Teléfono')
  if (!p.barrio?.trim()) faltan.push('Barrio')
  if (!p.puesto) faltan.push('Puesto')
  if (!p.mesa) faltan.push('Mesa')
  return faltan
}

type Barra = { label: string; value: number; color: string; preset?: DirectorioPreset }

// clave puede devolver varios valores (intereses, grupos sociales): cada uno suma 1.
function contar(lista: SimpatizanteApi[], clave: (p: SimpatizanteApi) => string | string[] | null | undefined, color: string, preset?: (label: string) => DirectorioPreset, top?: number): Barra[] {
  const conteo = new globalThis.Map<string, number>()
  for (const p of lista) {
    for (const k of [clave(p)].flat()) if (k) conteo.set(k, (conteo.get(k) ?? 0) + 1)
  }
  const data = [...conteo].map(([label, value]) => ({ label, value, color, preset: preset?.(label) })).sort((a, b) => b.value - a.value)
  return top ? data.slice(0, top) : data
}

type Detalle = 'conflicto' | 'fuga' | 'incompletos' | 'telefonos'

export default function Simpatizantes() {
  const { simpatizantesApi, cargarSimpatizantesApi, cargandoSimpatizantes, irADirectorio, navigate, openPersona } = useApp()
  const [tab, setTab] = useState<'dashboard' | 'directorio'>(window.location.pathname.endsWith('/directorio') ? 'directorio' : 'dashboard')
  const [vistaTerritorial, setVistaTerritorial] = useState('comunaVotacion')
  const [vistaTop, setVistaTop] = useState('topBarrios')
  const [vistaSocial, setVistaSocial] = useState('intereses')
  const [detalle, setDetalle] = useState<Exclude<Detalle, 'conflicto'> | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi() }, [])

  const todos = simpatizantesApi
  const validos = useMemo(() => todos.filter(esValido), [todos])
  const invalidos = useMemo(() => todos.filter((p) => !esValido(p)), [todos])

  const metrics = useMemo(() => {
    const total = todos.length
    const completos = todos.filter((p) => p.puesto && p.mesa).length
    const riesgo = validos.filter((p) => p.nivelVoto === 'Indeciso').length
    const porRol = contar(todos.filter((p) => (p.rol ?? 'simpatizante') !== 'simpatizante'), (p) => ROL_SIMPATIZANTE_LABEL[p.rol as RolSimpatizante], '')
    return { total, completos, riesgo, completitud: total ? Math.round((completos / total) * 100) : 0, porRol }
  }, [todos, validos])

  const salud = useMemo(() => {
    const porCedula = new globalThis.Map<string, SimpatizanteApi[]>()
    const porTelefono = new globalThis.Map<string, SimpatizanteApi[]>()
    for (const p of todos) {
      porCedula.set(p.cedula, [...(porCedula.get(p.cedula) ?? []), p])
      const tel = p.telefono?.replace(/\D/g, '')
      if (tel) porTelefono.set(tel, [...(porTelefono.get(tel) ?? []), p])
    }
    const duplicados = [...porCedula.values()].filter((g) => g.length > 1)
      .map((g) => g.slice().sort((a, b) => (a.creadoEn ?? '').localeCompare(b.creadoEn ?? '')))
    const telefonos = [...porTelefono].filter(([, g]) => g.length > 1).sort((a, b) => b[1].length - a[1].length)
    const incompletos = todos.filter((p) => camposFaltantes(p).length > 0)
    return { duplicados, telefonos, incompletos, telefonosAfectados: telefonos.reduce((s, [, g]) => s + g.length, 0) }
  }, [todos])

  const pct = (n: number, d: number) => `${d ? Math.round((n / d) * 100) : 0}%`
  const cards: [string, ReactNode, string, string, DirectorioPreset][] = [
    ['Total Simpatizantes Registrados', metrics.total, metrics.porRol.length ? `Incluye ${metrics.porRol.map((r) => `${r.value} ${r.label.toLowerCase()}`).join(' · ')}` : 'Conteo global de fichas registradas', 'text-gray-900', {}],
    [`Votos Válidos en ${MUNICIPIO_CAMPANA}`, validos.length, `${pct(validos.length, metrics.total)} del total`, 'text-emerald-600', { validez: 'valido' }],
    ['Votos Inválidos / Fuera de Circunscripción', invalidos.length, `${pct(invalidos.length, metrics.total)} del total`, 'text-red-600', { validez: 'invalido' }],
    ['Votos Indecisos / En Riesgo', metrics.riesgo, `${pct(metrics.riesgo, validos.length)} de los válidos`, 'text-amber-600', { validez: 'valido', nivelVoto: 'Indeciso' }],
    ['Completitud de Datos Electorales', `${metrics.completitud}%`, `${metrics.completos} de ${metrics.total} con puesto y mesa asignados`, 'text-emerald-600', {}],
  ]

  const healthCards: [Detalle, string, number, LucideIcon][] = [
    ['conflicto', 'Simpatizantes en Conflicto', salud.duplicados.length, Flag],
    ['fuga', 'Fuga Territorial', invalidos.length, Map],
    ['incompletos', 'Datos Incompletos', salud.incompletos.length, List],
    ['telefonos', 'Concentración Telefónica', salud.telefonosAfectados, Megaphone],
  ]

  const territorial: Record<string, { titulo: string; subtitulo: string; data: Barra[] }> = {
    comunaVotacion: { titulo: 'Votos Válidos por Comuna de Votación', subtitulo: 'Solo simpatizantes con validez Válido', data: contar(validos, (p) => puestoDe(p)?.comuna, '#2563eb') },
    corregimientoVotacion: { titulo: 'Votos Válidos por Corregimiento de Votación', subtitulo: 'Solo simpatizantes con validez Válido', data: contar(validos, (p) => puestoDe(p)?.corregimiento, '#2563eb') },
    comunaResidencia: { titulo: 'Distribución por Comuna de Residencia', subtitulo: 'Todos los simpatizantes', data: contar(todos, (p) => p.comuna, '#0891b2', (comuna) => ({ comuna })) },
    corregimientoResidencia: { titulo: 'Distribución por Corregimiento de Residencia', subtitulo: 'Todos los simpatizantes', data: contar(todos, (p) => p.corregimiento, '#0891b2', (corregimiento) => ({ corregimiento })) },
  }
  const nombrePuesto = (p: SimpatizanteApi) => puestoDe(p)?.nombre ?? p.puesto
  const presetPuesto = (nombre: string) => {
    const p = todos.find((x) => nombrePuesto(x) === nombre)
    return p?.puesto ? { puesto: p.puesto } : {}
  }
  const top: Record<string, { titulo: string; subtitulo: string; data: Barra[] }> = {
    topBarrios: { titulo: 'Top Barrios con más votos válidos', subtitulo: 'Solo simpatizantes con validez Válido', data: contar(validos, (p) => p.barrio, '#11998e', (barrio) => ({ validez: 'valido', barrio }), 15) },
    topCorregimientos: { titulo: 'Top Corregimientos con más votos válidos', subtitulo: 'Solo simpatizantes con validez Válido', data: contar(validos, (p) => p.corregimiento, '#11998e', (corregimiento) => ({ validez: 'valido', corregimiento }), 15) },
    rankingPuestosUrbanos: { titulo: 'Ranking de Puestos de Votación (zona urbana)', subtitulo: 'Votos válidos por puesto', data: contar(validos.filter((p) => (puestoDe(p)?.zona ?? 'Urbana') === 'Urbana'), nombrePuesto, '#11998e', presetPuesto, 15) },
    rankingPuestosRurales: { titulo: 'Ranking de Puestos de Votación (zona rural)', subtitulo: 'Votos válidos por puesto', data: contar(validos.filter((p) => puestoDe(p)?.zona === 'Rural'), nombrePuesto, '#11998e', presetPuesto, 15) },
    destinoInvalidos: { titulo: 'Destino de Votos Inválidos', subtitulo: 'Municipio de residencia de los votos fuera de circunscripción', data: contar(invalidos, (p) => p.municipio, '#dc2626', (municipio) => ({ validez: 'invalido', municipio }), 15) },
  }
  const social: Record<string, { titulo: string; subtitulo: string; data: Barra[] }> = {
    intereses: { titulo: 'Intereses y Temas Predominantes', subtitulo: 'Caracterización declarada por los propios simpatizantes', data: contar(todos, (p) => p.intereses, '#7c3aed', (interes) => ({ interes })) },
    gruposSociales: { titulo: 'Distribución por Grupos Sociales', subtitulo: 'Grupos a los que pertenecen', data: contar(todos, (p) => p.gruposSociales, '#7c3aed', (grupoSocial) => ({ grupoSocial })) },
    academico: { titulo: 'Nivel Académico', subtitulo: 'Máximo nivel alcanzado', data: contar(todos, (p) => p.nivelAcademico, '#7c3aed', (nivelAcademico) => ({ nivelAcademico })) },
  }

  const selectCls = 'rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500'
  const chart = (opciones: Record<string, { titulo: string; subtitulo: string; data: Barra[] }>, vista: string, setVista: (v: string) => void) => {
    const { titulo, subtitulo, data } = opciones[vista]
    return (
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-gray-800">{titulo}</p><p className="text-xs text-gray-400">{subtitulo}</p></div>
          <select className={selectCls} value={vista} onChange={(e) => setVista(e.target.value)}>
            {Object.entries(opciones).map(([k, o]) => <option key={k} value={k}>{o.titulo}</option>)}
          </select>
        </div>
        {data.length === 0
          ? <p className="py-16 text-center text-sm text-gray-400">{cargandoSimpatizantes ? 'Cargando…' : 'Sin datos para esta vista.'}</p>
          : <>
              <p className="mb-1 mt-3 text-[11px] text-gray-400">Haz clic en una barra para ver el detalle en el Directorio.</p>
              <Bars data={data} height={245} onBarClick={(d) => irADirectorio(d.preset ?? {})} />
            </>}
      </Card>
    )
  }

  const th = 'whitespace-nowrap px-4 py-2.5 font-semibold'
  const td = 'whitespace-nowrap px-4 py-3 text-gray-600'
  const nombreBtn = (p: SimpatizanteApi) => (
    <button type="button" onClick={() => openPersona({ mode: 'edit', personaId: p.id })} className="font-medium text-blue-700 hover:underline">{p.nombres} {p.apellidos}</button>
  )
  const registro = (p: SimpatizanteApi) => `${(p.creadoEn ?? '').slice(0, 10)} · ${p.trazabilidad?.registradoPor?.nombre ?? '—'}`
  const tabla = (headers: string[], filas: ReactNode[], vacio: string) => (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>{headers.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filas.length ? filas : <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-gray-400">{vacio}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  const detalles: Record<Detalle, { titulo: string; contenido: ReactNode }> = {
    conflicto: { titulo: 'Mesa de Control y Paternidad de Duplicados', contenido: tabla(['Cédula', 'Nombre', 'Primer registro', 'Segundo registro'],
      salud.duplicados.map(([a, b]) => <tr key={a.cedula} className="hover:bg-gray-50"><td className={td}>{a.cedula}</td><td className={td}>{nombreBtn(a)}</td><td className={td}>{registro(a)}</td><td className={td}><button type="button" onClick={() => openPersona({ mode: 'edit', personaId: b.id })} className="text-blue-700 hover:underline">{registro(b)}</button></td></tr>),
      'No hay cédulas duplicadas. 🎉') },
    fuga: { titulo: 'Fuga Territorial', contenido: tabla(['Nombre', 'Cédula', 'Departamento', 'Municipio'],
      invalidos.map((p) => <tr key={p.id} className="hover:bg-gray-50"><td className={td}>{nombreBtn(p)}</td><td className={td}>{p.cedula}</td><td className={td}>{p.departamento ?? '—'}</td><td className={td}>{p.municipio}</td></tr>),
      `Todos residen en ${MUNICIPIO_CAMPANA}.`) },
    incompletos: { titulo: 'Datos Incompletos', contenido: tabla(['Nombre', 'Cédula', 'Le falta'],
      salud.incompletos.map((p) => <tr key={p.id} className="hover:bg-gray-50"><td className={td}>{nombreBtn(p)}</td><td className={td}>{p.cedula}</td><td className={td}>{camposFaltantes(p).join(', ')}</td></tr>),
      'Todas las fichas tienen teléfono, barrio, puesto y mesa.') },
    telefonos: { titulo: 'Concentración Telefónica', contenido: tabla(['Teléfono', 'Fichas', 'Simpatizantes'],
      salud.telefonos.map(([tel, g]) => <tr key={tel} className="hover:bg-gray-50"><td className={td}>{tel}</td><td className={td}>{g.length}</td><td className="px-4 py-3 text-gray-600"><div className="flex flex-wrap gap-x-3 gap-y-1">{g.map((p) => <span key={p.id}>{nombreBtn(p)}</span>)}</div></td></tr>),
      'Ningún teléfono se repite entre fichas.') },
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Simpatizante</h1>
        <p className="text-sm text-gray-500">Directorio y dashboard analítico de simpatizantes</p>
        <div className="mt-4 flex gap-6 border-b border-gray-200">
          {(['dashboard', 'directorio'] as const).map((item) => (
            <button key={item} type="button" onClick={() => { setTab(item); navigate(item === 'dashboard' ? 'simpatizantes' : 'directorio') }} className={`border-b-2 px-1 pb-3 text-sm font-medium ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {item === 'dashboard' ? 'Dashboard' : 'Directorio'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'directorio' ? <Directorio /> : (
        <div className="space-y-10">
          <section>
            <p className="mb-3 text-sm font-semibold text-gray-700">Panorama Electoral</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {cards.map(([title, value, detail, color, preset]) => (
                <Card key={title}>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
                  <button type="button" onClick={() => irADirectorio(preset)} className={`mt-2 text-2xl font-semibold hover:underline ${color}`}>{cargandoSimpatizantes && !metrics.total ? '…' : value}</button>
                  <p className="mt-1 text-xs text-gray-400">{detail}</p>
                </Card>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-3 text-sm font-semibold text-gray-700">Salud e Integridad de la Base de Datos</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {healthCards.map(([key, title, count, Icon]) => (
                <button key={key} type="button" onClick={() => key === 'conflicto' ? document.getElementById('duplicados')?.scrollIntoView({ behavior: 'smooth' }) : setDetalle((d) => (d === key ? null : key))} className={`group flex flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40 ${detalle === key ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title} — {count}</p>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${count ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}><Icon className="h-4 w-4" /></span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-blue-700">{key === 'conflicto' ? 'Ver detalle ↓' : detalle === key ? 'Ocultar detalle ↑' : 'Ver detalle →'}</p>
                </button>
              ))}
            </div>
            {detalle && (
              <div className="mt-4">
                <p className="mb-3 text-sm font-semibold text-gray-700">{detalles[detalle].titulo}</p>
                {detalles[detalle].contenido}
              </div>
            )}
          </section>
          <section>
            <p className="mb-3 text-sm font-semibold text-gray-700">Análisis Territorial</p>
            {chart(territorial, vistaTerritorial, setVistaTerritorial)}
          </section>
          <section>
            <p className="mb-3 text-sm font-semibold text-gray-700">Penetración Geográfica Detallada</p>
            {chart(top, vistaTop, setVistaTop)}
          </section>
          <section>
            <p className="mb-3 text-sm font-semibold text-gray-700">Caracterización Social y Discurso</p>
            {chart(social, vistaSocial, setVistaSocial)}
          </section>
          <section id="duplicados" className="pt-2">
            <p className="mb-3 text-sm font-semibold text-gray-700">{detalles.conflicto.titulo}</p>
            {detalles.conflicto.contenido}
          </section>
        </div>
      )}
    </main>
  )
}
