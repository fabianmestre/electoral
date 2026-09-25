import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Car, ChevronLeft, ChevronRight, Flag, RefreshCw, Search, Users, Vote } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp } from '../../../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA } from '../../../data'
import type { SimpatizanteApi } from '../../../types'
import { Badge, Bars, Card, Donut, Kpi, Legend, Modal, ProgressBar } from '../../../components/ui'
import Censo from '../../core/pages/Censo'

const NIVEL_COLORS: Record<string, string> = { Firme: '#10b981', Indeciso: '#f59e0b', 'En Riesgo': '#f43f5e' }

const esValidoApi = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA

function estadoLiderTone(cumplida: boolean, pctMeta: number): string {
  if (cumplida) return 'bg-emerald-100 text-emerald-700'
  if (pctMeta >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

const nombreCorto = (l: { nombres: string }) => l.nombres.split(' ')[0]

// Jornada electoral: solo ese día se reportan votos en tiempo real.
const FECHA_JORNADA = '2026-09-15'
const TABS: ['votos' | 'lideres' | 'transporte' | 'censo', string, LucideIcon][] = [['votos', 'Votos', Vote], ['lideres', 'Líderes', Users], ['transporte', 'Transporte', Car], ['censo', 'División Electoral', Flag]]

const lugarDe = (p: { zona: string | null; comuna?: string | null; corregimiento?: string | null }) =>
  p.zona === 'Urbana' ? (p.comuna ?? '?') : p.zona === 'Rural' ? (p.corregimiento ?? '?') : 'Por confirmar'

const horaCorta = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

function GroupedBarsScroll({
  groups,
  series,
}: {
  groups: string[]
  series: { label: string; color: string; values: number[] }[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const max = Math.max(...series.flatMap((s) => s.values), 1)
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  return (
    <div>
      <div className="relative">
        <button
          onClick={() => scroll(-1)}
          aria-label="Desplazar a la izquierda"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div ref={ref} className="overflow-x-auto">
          <div className="flex items-end gap-4 h-52 min-w-max px-12">
            {groups.map((g, gi) => (
              <div key={g} className="w-16 shrink-0 flex flex-col items-center justify-end gap-1 h-full">
                <div className="flex items-end gap-1">
                  {series.map((s) => (
                    <div
                      key={s.label}
                      title={`${g} · ${s.label}: ${s.values[gi]}`}
                      className="w-4 rounded-t-sm"
                      style={{ height: `${Math.max(2, (s.values[gi] / max) * 150)}px`, backgroundColor: s.color }}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-slate-600 truncate w-full text-center leading-tight">{g}</div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => scroll(1)}
          aria-label="Desplazar a la derecha"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-4 mt-2">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Logistica() {
  const {
    simpatizantesApi, lideresApi, actividadDiaEApi, cargarSimpatizantesApi, cargarLideresApi, cargarActividadApi,
    registrarVotoApi, verSimpatizanteDetalle, irADirectorio, openPersona,
  } = useApp()
  const [tab, setTab] = useState<'votos' | 'lideres' | 'transporte' | 'censo'>('votos')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => new Date())
  const [buscarVoto, setBuscarVoto] = useState('')
  const [registrando, setRegistrando] = useState<string | null>(null)
  // Detalle de una alerta: se guarda el criterio (no la lista) para que se actualice al marcar votos.
  const [detalle, setDetalle] = useState<{ titulo: string; subtitulo: string; filtro: (p: SimpatizanteApi) => boolean } | null>(null)

  useEffect(() => {
    void cargarSimpatizantesApi()
    void cargarLideresApi()
    void cargarActividadApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), 1000)
    return () => window.clearInterval(t)
  }, [])

  const actualizar = () => {
    void cargarSimpatizantesApi()
    void cargarLideresApi()
    void cargarActividadApi()
  }

  const marcarVoto = async (id: string) => {
    setRegistrando(id)
    await registrarVotoApi(id)
    setRegistrando(null)
  }

  const resultadosBusqueda = useMemo(() => {
    const q = buscarVoto.trim().toLowerCase()
    if (q.length < 2) return []
    return simpatizantesApi
      .filter((p) => `${p.nombres} ${p.apellidos} ${p.cedula}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [simpatizantesApi, buscarVoto])

  const esperados = simpatizantesApi.filter(esValidoApi).length
  const votosRegistradosValidos = simpatizantesApi.filter((p) => p.votoRegistrado && esValidoApi(p)).length
  const pctValidos = esperados ? Math.round((votosRegistradosValidos / esperados) * 100) : 0

  const vehDisp = useMemo(
    () => simpatizantesApi.flatMap((p) => p.vehiculos.filter((v) => v.aDisposicion).map((v) => ({ ...v, propietario: p }))),
    [simpatizantesApi],
  )
  const capTotal = vehDisp.reduce((s, v) => s + (Number(v.capacidadPasajeros) || 0), 0)
  const conductores = new Set(vehDisp.map((v) => v.propietario.id)).size

  const porHora: Record<string, number> = {}
  simpatizantesApi.filter((p) => p.votoRegistrado && p.votoHora).forEach((p) => {
    const h = String(new Date(p.votoHora as string).getHours()).padStart(2, '0')
    porHora[h] = (porHora[h] || 0) + 1
  })
  const barrasHora = Object.keys(porHora).sort().map((h) => ({ label: `${h}:00`, value: porHora[h], color: '#6366f1' }))

  const votosDe = (lid: string) => simpatizantesApi.filter((p) => p.votoRegistrado && p.liderId === lid).length

  /* ---- Esperados vs reportados por territorio ---- */
  const porLugar: Record<string, { esperados: number; reportados: number }> = {}
  simpatizantesApi.filter(esValidoApi).forEach((p) => {
    const lugar = lugarDe(p)
    if (!porLugar[lugar]) porLugar[lugar] = { esperados: 0, reportados: 0 }
    porLugar[lugar].esperados++
    if (p.votoRegistrado) porLugar[lugar].reportados++
  })
  const lugaresOrdenados = Object.keys(porLugar).sort((a, b) => porLugar[b].esperados - porLugar[a].esperados)
  const barrasLugar = {
    groups: lugaresOrdenados,
    series: [
      { label: 'Esperados', color: '#94a3b8', values: lugaresOrdenados.map((l) => porLugar[l].esperados) },
      { label: 'Reportados', color: '#6366f1', values: lugaresOrdenados.map((l) => porLugar[l].reportados) },
    ],
  }

  const porNivelVoto: Record<string, number> = { Firme: 0, Indeciso: 0, 'En Riesgo': 0 }
  simpatizantesApi.filter(esValidoApi).forEach((p) => {
    porNivelVoto[p.nivelVoto] = (porNivelVoto[p.nivelVoto] || 0) + 1
  })
  const donaNivel = Object.keys(porNivelVoto).map((k) => ({ label: k, value: porNivelVoto[k], color: NIVEL_COLORS[k] }))

  const bitacora = actividadDiaEApi.slice(0, 30)

  const porLugarVeh: Record<string, typeof vehDisp> = {}
  vehDisp.forEach((v) => {
    const lugar = lugarDe(v.propietario)
    ;(porLugarVeh[lugar] = porLugarVeh[lugar] || []).push(v)
  })

  /* ---- Alertas de movilización ---- */
  const firmesValidosTotal = simpatizantesApi.filter((p) => p.nivelVoto === 'Firme' && esValidoApi(p)).length
  const firmesSinVotar = simpatizantesApi.filter((p) => p.nivelVoto === 'Firme' && esValidoApi(p) && !p.votoRegistrado).length
  const DOS_HORAS_MS = 2 * 60 * 60 * 1000
  const ultimaActividad = (lid: string) =>
    actividadDiaEApi.find((a) => a.liderId === lid)?.creadoEn // ya viene ordenado desc del backend
  const lideresInactivos = lideresApi.filter((l) => l.activo).filter((l) => {
    const ultima = ultimaActividad(l.id)
    return !ultima || ahora.getTime() - new Date(ultima).getTime() > DOS_HORAS_MS
  })
  const brechas = Object.entries(porLugar)
    .map(([lugar, { esperados: e, reportados: r }]) => ({ lugar, esperados: e, reportados: r, brecha: e - r }))
    .filter((b) => b.brecha > 0)
    .sort((a, b) => b.brecha - a.brecha)
    .slice(0, 3)

  /* ---- Cuellos de botella (transporte) ---- */
  const porLugarFirmesSinVotar: Record<string, number> = {}
  simpatizantesApi.filter((p) => esValidoApi(p) && p.nivelVoto === 'Firme' && !p.votoRegistrado).forEach((p) => {
    const lugar = lugarDe(p)
    porLugarFirmesSinVotar[lugar] = (porLugarFirmesSinVotar[lugar] || 0) + 1
  })
  const cuellos = Object.entries(porLugarFirmesSinVotar)
    .map(([lugar, firmes]) => {
      const vs = porLugarVeh[lugar]
      return {
        lugar,
        firmes,
        vehiculos: vs ? vs.length : 0,
        capacidad: vs ? vs.reduce((s, v) => s + (Number(v.capacidadPasajeros) || 0), 0) : 0,
      }
    })
    .filter((c) => c.firmes > 0)
    .sort((a, b) => b.firmes - a.firmes)

  /* ---- Trabajo de líderes ---- */
  const ranking = lideresApi.filter((l) => l.activo).map((l) => {
    const votos = votosDe(l.id)
    const firmes = simpatizantesApi.filter((p) => p.liderId === l.id && p.nivelVoto === 'Firme' && esValidoApi(p)).length
    const pctMeta = l.meta ? Math.round((votos / l.meta) * 100) : 0
    const acciones = actividadDiaEApi.filter((a) => a.liderId === l.id).length
    const ultima = ultimaActividad(l.id)
    const activo = !!ultima && ahora.getTime() - new Date(ultima).getTime() <= DOS_HORAS_MS
    return { ...l, votos, firmes, pctMeta, acciones, activo }
  }).sort((a, b) => b.pctMeta - a.pctMeta)

  const metaVsVotos = {
    groups: lideresApi.filter((l) => l.activo).map((l) => nombreCorto(l)),
    series: [
      { label: 'Votos hoy', color: '#6366f1', values: lideresApi.filter((l) => l.activo).map((l) => votosDe(l.id)) },
      { label: 'Meta', color: '#cbd5e1', values: lideresApi.filter((l) => l.activo).map((l) => l.meta) },
    ],
  }

  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
  const pendientes = esperados - votosRegistradosValidos
  const pctPend = esperados ? 100 - pctValidos : 0
  const porMovilizar = lideresApi
    .filter((l) => l.activo)
    .map((l) => ({ id: l.id, nombre: `${l.nombres} ${l.apellidos}`, n: simpatizantesApi.filter((p) => p.liderId === l.id && esValidoApi(p) && !p.votoRegistrado).length }))
    .filter((l) => l.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)
  const maxMovilizar = Math.max(1, ...porMovilizar.map((l) => l.n))

  return (
    <main className="flex-1 overflow-y-auto p-6"><div>
      <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Centro de Mando — Día E</h1><p className="text-sm text-gray-500">Votos, líderes, transporte y censo</p></div>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-blue-600 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-bold">Centro de Mando — Día E</p>
          <p className="text-sm text-blue-100">{hoy === FECHA_JORNADA
            ? 'Monitoreo en tiempo real de la movilización de votantes — jornada electoral en curso.'
            : 'Monitoreo en tiempo real de la movilización de votantes — fuera de la jornada electoral (15/09/2026), mostrando el estado actual de los datos.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/15 px-4 py-2 text-sm"><span className="font-semibold tabular-nums">{ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span> <span className="text-blue-100">hora actual</span></div>
          <button onClick={actualizar} className="flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><RefreshCw className="h-4 w-4" />Actualizar</button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === id ? 'bg-blue-600 text-white' : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>

      {tab === 'votos' ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              [`Válidos en ${MUNICIPIO_CAMPANA}`, esperados, 'text-gray-900', '', () => irADirectorio({ validez: 'valido' })],
              ['Ya votaron', votosRegistradosValidos, 'text-emerald-600', `${pctValidos}% del total`, undefined],
              ['Pendientes', pendientes, 'text-amber-600', `${pctPend}% del total`, undefined],
              ['Firmes sin votar', firmesSinVotar, 'text-red-600', 'Prioridad de movilización', () => irADirectorio({ validez: 'valido', nivelVoto: 'Firme' })],
            ] as [string, number, string, string, (() => void) | undefined][]).map(([t, v, c, d, onClick]) => (
              <div key={t} onClick={onClick} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}`}>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t}</p>
                <p className={`mt-2 text-2xl font-semibold ${c}`}>{v}</p>
                {d && <p className="mt-1 text-xs text-gray-400">{d}</p>}
              </div>
            ))}
          </div>
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">Avance de votación</p>
              <p className="text-xs text-gray-400">Válidos en {MUNICIPIO_CAMPANA}</p>
              <div className="mt-4 flex items-center gap-5">
                <div className="h-40 w-40 shrink-0 rounded-full p-[20%]" style={{ background: esperados ? `conic-gradient(#2563eb 0 ${pctValidos}%, #7c3aed ${pctValidos}% 100%)` : '#f3f4f6' }}><div className="h-full w-full rounded-full bg-white" /></div>
                <ul className="space-y-2 text-sm">
                  <li><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Ya votó <b>{votosRegistradosValidos}</b> <span className="text-gray-400">({pctValidos}%)</span></li>
                  <li><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-violet-600" />Pendiente <b>{pendientes}</b> <span className="text-gray-400">({pctPend}%)</span></li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-gray-800">Líderes con más simpatizantes por movilizar</p>
              <p className="text-xs text-gray-400">Top 10 — clic para ver el listado</p>
              <div className="mt-4 space-y-2">
                {porMovilizar.length === 0 && <p className="py-8 text-center text-sm text-gray-400">No hay simpatizantes válidos pendientes por movilizar.</p>}
                {porMovilizar.map((l) => (
                  <button key={l.id} type="button" onClick={() => irADirectorio({ liderId: l.id, validez: 'valido' })} className="flex w-full items-center gap-3 text-xs hover:opacity-80">
                    <span className="w-36 truncate text-right text-gray-500">{l.nombre}</span>
                    <div className="h-5 flex-1 rounded bg-gray-50"><div className="h-5 rounded bg-blue-600" style={{ width: `${Math.max(8, (l.n / maxMovilizar) * 100)}%` }} /></div>
                    <span className="w-7 text-left text-gray-500">{l.n}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Check-in: registrar voto */}
          <Card title="🔎 Registrar voto (buscar por nombre o cédula)" className="mb-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={buscarVoto}
                onChange={(e) => setBuscarVoto(e.target.value)}
                placeholder="Nombre o cédula del simpatizante..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {buscarVoto.trim().length >= 2 && (
              <ul className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {resultadosBusqueda.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Sin coincidencias.</li>}
                {resultadosBusqueda.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <button onClick={() => verSimpatizanteDetalle(p.id)} className="text-left min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{p.nombres} {p.apellidos}</div>
                      <div className="text-[11px] text-slate-400 font-mono">CC {p.cedula} · {p.barrio}</div>
                    </button>
                    {p.votoRegistrado ? (
                      <Badge className="bg-emerald-100 text-emerald-700 shrink-0">
                        ✅ Votó · {p.votoHora ? horaCorta(p.votoHora) : ''}
                      </Badge>
                    ) : (
                      <button
                        onClick={() => void marcarVoto(p.id)}
                        disabled={registrando === p.id}
                        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registrando === p.id ? 'Registrando…' : 'Marcar voto'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Comuna/corregimiento en barras verticales */}
          <Card title="🗺️ Votos por comuna / corregimiento (esperados vs reportados)" className="mb-4">
            <GroupedBarsScroll groups={barrasLugar.groups} series={barrasLugar.series} />
          </Card>

          {/* Alertas */}
          <Card title="🚨 Alertas de movilización" className="mb-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                <div className="text-xs font-bold text-red-700 mb-1.5">Líderes sin actividad (+2 h)</div>
                {lideresInactivos.length === 0 ? (
                  <p className="text-xs text-emerald-700 font-medium">Todos activos ✅</p>
                ) : (
                  <ul className="space-y-1">
                    {lideresInactivos.map((l) => (
                      <li key={l.id}>
                        <button onClick={() => irADirectorio({ liderId: l.id })} className="text-xs text-red-700 hover:underline text-left">
                          ⚠️ {nombreCorto(l)} {l.apellidos.split(' ')[0]}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                <div className="text-xs font-bold text-amber-700 mb-1.5">Zonas con más por movilizar</div>
                <ul className="space-y-1">
                  {brechas.length === 0 && <li className="text-xs font-medium text-emerald-700">Sin pendientes ✅</li>}
                  {brechas.map((b) => (
                    <li key={b.lugar}>
                      <button
                        type="button"
                        onClick={() => setDetalle({
                          titulo: `Por movilizar en ${b.lugar}`,
                          subtitulo: `${b.brecha} simpatizante(s) válido(s) aún sin reportar voto (${b.reportados}/${b.esperados})`,
                          filtro: (p) => esValidoApi(p) && !p.votoRegistrado && lugarDe(p) === b.lugar,
                        })}
                        className="text-left text-xs text-amber-800 hover:underline"
                      >
                        <b>{b.lugar}</b>: {b.brecha} por reportar ({b.reportados}/{b.esperados}) →
                      </button>
                    </li>
                  ))}
                </ul>
                {brechas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDetalle({
                      titulo: 'Zonas con más por movilizar',
                      subtitulo: `${esperados - votosRegistradosValidos} simpatizante(s) válido(s) aún sin reportar voto, ordenados por zona`,
                      filtro: (p) => esValidoApi(p) && !p.votoRegistrado,
                    })}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Ver detalle →
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetalle({
                  titulo: 'Firmes aún sin votar',
                  subtitulo: `Prioridad de movilización: ${firmesSinVotar} de ${firmesValidosTotal} firmes válidos`,
                  filtro: (p) => esValidoApi(p) && p.nivelVoto === 'Firme' && !p.votoRegistrado,
                })}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50/40"
              >
                <div className="text-xs font-bold text-slate-700 mb-1.5">Firmes aún sin votar</div>
                <div className="text-2xl font-extrabold text-slate-800">{firmesSinVotar}</div>
                <div className="text-xs text-slate-500">de {firmesValidosTotal} firmes válidos</div>
                <div className="mt-2 text-xs font-semibold text-blue-600">Ver detalle →</div>
              </button>
            </div>
          </Card>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="🕐 Votos reportados por hora">
              <Bars data={barrasHora} />
            </Card>
            <Card title="📡 Bitácora en vivo (actividad de líderes)">
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {bitacora.length === 0 && <p className="text-sm text-slate-400">Sin actividad registrada.</p>}
                {bitacora.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 border-b border-slate-100 py-1.5">
                    <span className="text-[11px] font-mono text-slate-400 shrink-0 w-12">{horaCorta(a.creadoEn)}</span>
                    <Badge className={a.tipo === 'Apertura' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700 shrink-0'}>
                      {a.tipo}
                    </Badge>
                    <div className="min-w-0 text-sm">
                      <span className="font-medium text-slate-700">{a.lider ? `${a.lider.nombres} ${a.lider.apellidos}` : '—'}</span>{' '}
                      <span className="text-slate-500">{a.detalle}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="🧭 Simpatizantes válidos por nivel de compromiso">
              <div className="w-40 h-40 mx-auto">
                <Donut data={donaNivel} />
              </div>
              <Legend data={donaNivel} />
            </Card>
          </div>
        </>
      ) : tab === 'lideres' ? (
        <>
          <Card title="🎯 Meta vs. votos registrados por líder" className="mb-4">
            <GroupedBarsScroll groups={metaVsVotos.groups} series={metaVsVotos.series} />
          </Card>

          <Card title="🏆 Ranking de desempeño de líderes">
            <p className="text-xs text-slate-500 mb-3">
              Ordenado por avance sobre la meta. Haz clic en «Simpatizantes» para abrir su zona en el Directorio.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {['#', 'Líder', 'Territorio', 'Meta', 'Votos hoy', 'Avance de meta', 'Por movilizar', 'Acciones', 'Estado', ''].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => {
                    const cumplida = r.votos >= r.meta
                    const porMovilizar = Math.max(0, r.meta - r.votos)
                    return (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-sm text-slate-400 font-semibold">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="text-sm font-semibold text-slate-800">{nombreCorto(r)} {r.apellidos.split(' ')[0]}</div>
                          <div className="text-[11px] text-slate-400">{r.rolDiaE}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[180px] truncate" title={r.territorio ?? ''}>
                          {r.territorio || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-sm font-semibold text-slate-700">{r.meta}</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-blue-700">{r.votos}</td>
                        <td className="px-3 py-2.5 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <ProgressBar pct={Math.min(100, r.pctMeta)} color={cumplida ? 'bg-emerald-500' : r.pctMeta >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
                            <span className="text-xs font-semibold text-slate-600 w-10">{r.pctMeta}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-slate-600">{porMovilizar}</td>
                        <td className="px-3 py-2.5 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-slate-400" />
                            {r.acciones}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge className={estadoLiderTone(cumplida, r.pctMeta)}>
                            {cumplida ? '✅ En meta' : r.pctMeta >= 50 ? '🟡 Avanzando' : '🔴 En riesgo'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => irADirectorio({ liderId: r.id })}
                            className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                          >
                            Simpatizantes →
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : tab === 'censo' ? (
        <Censo />
      ) : (
        <>
          {/* KPIs transporte */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Kpi icon={Car} label="Vehículos a disposición" value={vehDisp.length} accent="text-blue-600" />
            <Kpi icon={Users} label="Conductores voluntarios" value={conductores} accent="text-sky-600" />
            <Kpi icon={Car} label="Zonas con transporte" value={Object.keys(porLugarVeh).length} accent="text-emerald-600" />
            <Kpi icon={Users} label="Capacidad total (pax)" value={capTotal} accent="text-purple-600" />
          </div>

          <Card title="🚨 Cuellos de botella de movilización" className="mb-4">
            <p className="text-xs text-slate-500 mb-2">
              Firmes válidos que aún no votan (demanda) vs. vehículos disponibles por territorio (oferta).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {['Territorio', 'Firmes por movilizar', 'Vehículos', 'Capacidad (pax)', 'Estado'].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cuellos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-slate-400 text-sm text-center">Sin firmes pendientes de movilizar 🎉</td>
                    </tr>
                  )}
                  {cuellos.map((c) => {
                    const sinTransporte = c.vehiculos === 0
                    const limitado = !sinTransporte && c.capacidad < c.firmes
                    return (
                      <tr key={c.lugar} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2.5 text-sm font-medium">{c.lugar}</td>
                        <td className="px-3 py-2.5 text-sm font-semibold text-blue-700">{c.firmes}</td>
                        <td className="px-3 py-2.5 text-sm">{c.vehiculos}</td>
                        <td className="px-3 py-2.5 text-sm">{c.capacidad}</td>
                        <td className="px-3 py-2.5">
                          {sinTransporte ? (
                            <Badge className="bg-red-100 text-red-700">🔴 Sin transporte</Badge>
                          ) : limitado ? (
                            <Badge className="bg-amber-100 text-amber-700">🟡 Limitado</Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700">🟢 Cubierto</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="🚗 Vehículos por comuna / corregimiento">
            <p className="text-xs text-slate-500 mb-2">Haz clic en una fila para ver los propietarios de los vehículos.</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    {['Comuna / Corregimiento', 'Vehículos', 'Capacidad (pax)'].map((h) => (
                      <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(porLugarVeh)
                    .sort((a, b) => b[1].length - a[1].length)
                    .map(([lugar, vehiculos]) => {
                      const cap = vehiculos.reduce((s, v) => s + (Number(v.capacidadPasajeros) || 0), 0)
                      return (
                        <Fragment key={lugar}>
                          <tr
                            onClick={() => setExpanded(expanded === lugar ? null : lugar)}
                            className="cursor-pointer hover:bg-slate-50 border-b border-slate-100"
                          >
                            <td className="px-3 py-2.5 text-sm font-medium">
                              {expanded === lugar ? '▾' : '▸'} {lugar}
                            </td>
                            <td className="px-3 py-2.5 text-sm">{vehiculos.length}</td>
                            <td className="px-3 py-2.5 text-sm">{cap}</td>
                          </tr>
                          {expanded === lugar &&
                            vehiculos.map((v, i) => (
                              <tr key={i} className="bg-slate-50/70 border-b border-slate-100">
                                <td className="px-3 py-2 pl-8 text-sm">
                                  <button onClick={() => verSimpatizanteDetalle(v.propietario.id)} className="text-blue-600 hover:underline text-left">
                                    {v.propietario.nombres} {v.propietario.apellidos}
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-sm text-slate-600">{v.tipo}</td>
                                <td className="px-3 py-2 text-sm text-slate-600">{v.capacidadPasajeros} pax</td>
                              </tr>
                            ))}
                        </Fragment>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      <Modal open={!!detalle} onClose={() => setDetalle(null)} title={detalle?.titulo ?? ''} subtitle={detalle?.subtitulo} wide>
        {detalle && (() => {
          const personas = simpatizantesApi.filter(detalle.filtro).sort((a, b) => lugarDe(a).localeCompare(lugarDe(b), 'es', { numeric: true }) || a.nombres.localeCompare(b.nombres))
          const lider = (id: string | null) => { const l = lideresApi.find((x) => x.id === id); return l ? `${l.nombres} ${l.apellidos}` : '—' }
          return personas.length === 0
            ? <p className="py-8 text-center text-sm text-emerald-700">Todos reportaron su voto ✅</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>{['Nombre', 'Cédula', 'Teléfono', 'Zona', 'Barrio', 'Puesto', 'Mesa', 'Líder', ''].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{personas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2"><button type="button" onClick={() => { setDetalle(null); openPersona({ mode: 'edit', personaId: p.id }) }} className="font-medium text-blue-700 hover:underline">{p.nombres} {p.apellidos}</button></td>
                  <td className="px-3 py-2 text-slate-600">{p.cedula}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{p.telefono ? <a href={`tel:${p.telefono}`} className="hover:underline">{p.telefono}</a> : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{lugarDe(p)}</td>
                  <td className="px-3 py-2 text-slate-600">{p.barrio || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{p.puesto || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{p.mesa ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">{lider(p.liderId)}</td>
                  <td className="px-3 py-2 text-right"><button type="button" onClick={() => void marcarVoto(p.id)} disabled={registrando === p.id} className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">{registrando === p.id ? 'Registrando…' : 'Marcar voto'}</button></td>
                </tr>
              ))}</tbody>
            </table></div>
        })()}
      </Modal>
    </div></main>
  )
}
