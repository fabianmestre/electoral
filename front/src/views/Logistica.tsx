import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, Car, CheckCircle2, ChevronLeft, ChevronRight, Clock, RefreshCw, Search, Users } from 'lucide-react'
import { useApp } from '../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA } from '../data'
import type { SimpatizanteApi } from '../types'
import { Badge, Bars, Card, Donut, Kpi, Legend, ProgressBar } from '../components/ui'
import Censo from './Censo'

const NIVEL_COLORS: Record<string, string> = { Firme: '#10b981', Indeciso: '#f59e0b', 'En Riesgo': '#f43f5e' }

const esValidoApi = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA

function estadoLiderTone(cumplida: boolean, pctMeta: number): string {
  if (cumplida) return 'bg-emerald-100 text-emerald-700'
  if (pctMeta >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

const nombreCorto = (l: { nombres: string }) => l.nombres.split(' ')[0]

const lugarDe = (p: { zona: string; comuna?: string | null; corregimiento?: string | null }) =>
  p.zona === 'Urbana' ? (p.comuna ?? '?') : (p.corregimiento ?? '?')

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
    registrarVotoApi, verSimpatizanteDetalle, irADirectorio,
  } = useApp()
  const [tab, setTab] = useState<'votos' | 'lideres' | 'transporte' | 'censo'>('votos')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => new Date())
  const [buscarVoto, setBuscarVoto] = useState('')
  const [registrando, setRegistrando] = useState<string | null>(null)

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
  const votosRegistrados = simpatizantesApi.filter((p) => p.votoRegistrado).length
  const pct = esperados ? Math.round((votosRegistrados / esperados) * 100) : 0

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
  const lideresInactivos = lideresApi.filter((l) => {
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
  const ranking = lideresApi.map((l) => {
    const votos = votosDe(l.id)
    const firmes = simpatizantesApi.filter((p) => p.liderId === l.id && p.nivelVoto === 'Firme' && esValidoApi(p)).length
    const pctMeta = l.meta ? Math.round((votos / l.meta) * 100) : 0
    const acciones = actividadDiaEApi.filter((a) => a.liderId === l.id).length
    const ultima = ultimaActividad(l.id)
    const activo = !!ultima && ahora.getTime() - new Date(ultima).getTime() <= DOS_HORAS_MS
    return { ...l, votos, firmes, pctMeta, acciones, activo }
  }).sort((a, b) => b.pctMeta - a.pctMeta)

  const metaVsVotos = {
    groups: lideresApi.map((l) => nombreCorto(l)),
    series: [
      { label: 'Votos hoy', color: '#6366f1', values: lideresApi.map((l) => votosDe(l.id)) },
      { label: 'Meta', color: '#cbd5e1', values: lideresApi.map((l) => l.meta) },
    ],
  }

  return (
    <div>
      {/* Cabecera */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-2xl p-5 mb-4 text-white flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-extrabold">🗳️ Centro de Mando — Día E</h2>
          <p className="text-blue-100 text-sm">Monitoreo en tiempo real de la movilización de votantes</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4" />
            <span className="font-bold tabular-nums">{ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="text-blue-100 text-xs">hora actual</span>
          </div>
          <button
            onClick={actualizar}
            className="inline-flex items-center gap-2 bg-white text-blue-800 font-semibold rounded-lg px-4 py-2 hover:bg-blue-50"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('votos')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'votos' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          🗳️ Votos
        </button>
        <button
          onClick={() => setTab('lideres')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'lideres' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          👥 Líderes
        </button>
        <button
          onClick={() => setTab('transporte')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'transporte' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          🚗 Transporte
        </button>
        <button
          onClick={() => setTab('censo')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'censo' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          🗺️ División Electoral
        </button>
      </div>

      {tab === 'votos' ? (
        <>
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

          {/* KPIs votos */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Kpi icon={Users} label="Reportados / esperados" value={`${votosRegistrados} / ${esperados}`} accent="text-blue-600" />
            <Kpi icon={CheckCircle2} label="% de esperados reportados" value={`${pct}%`} accent="text-emerald-600" />
          </div>

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
                  {brechas.map((b) => (
                    <li key={b.lugar} className="text-xs text-amber-800">
                      <b>{b.lugar}</b>: {b.brecha} por reportar ({b.reportados}/{b.esperados})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-700 mb-1.5">Firmes aún sin votar</div>
                <div className="text-2xl font-extrabold text-slate-800">{firmesSinVotar}</div>
                <div className="text-xs text-slate-500">de {firmesValidosTotal} firmes válidos</div>
              </div>
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
    </div>
  )
}
