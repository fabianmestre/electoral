import { ArrowRight, CircleHelp, Flag, Map, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../../store'
import { DEPARTAMENTO_CAMPANA, MUNICIPIO_CAMPANA, PUESTOS } from '../../../data'
import type { SimpatizanteApi } from '../../../types'

const coloresBarrios = ['#2563eb', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#059669', '#db2777', '#4f46e5', '#65a30d', '#0891b2']

// Misma regla de validez que el Directorio: residencia en el municipio de campaña.
const esValido = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA
// Los puestos cargados en BD pueden venir como "pv-06"; el catálogo usa "PV06".
const normPuesto = (id: string) => id.toUpperCase().replace(/[^A-Z0-9]/g, '')
const nombrePuesto = (id: string | null) => (id ? PUESTOS.find((p) => normPuesto(p.id) === normPuesto(id))?.nombre ?? id : null)
const pct = (n: number, d: number) => `${d ? Math.round((n / d) * 100) : 0}%`

function agrupar<T>(lista: T[], clave: (x: T) => string | null | undefined) {
  const m = new globalThis.Map<string, number>()
  for (const x of lista) { const k = clave(x); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

const RANGOS: [string, number, number][] = [['Hasta 5', 0, 5], ['6–10', 6, 10], ['11–15', 11, 15], ['16–20', 16, 20], ['21–30', 21, 30], ['31–50', 31, 50], ['51–70', 51, 70], ['71–100', 71, 100], ['100+', 101, Infinity]]

function Kpi({ title, value, icon, onClick }: { title: string; value: string; icon: 'users'|'map'|'flag'|'help'; onClick?: () => void }) { const Icon = icon === 'users' ? Users : icon === 'map' ? Map : icon === 'flag' ? Flag : CircleHelp; return <div onClick={onClick} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}`}><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p></div> }

export default function Lideres() {
  const { navigate, lideresApi, simpatizantesApi, usuariosApi, cargarLideresApi, cargarSimpatizantesApi, cargarUsuariosApi, cargandoLideres } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarLideresApi(); void cargarSimpatizantesApi(); void cargarUsuariosApi() }, [])
  const [metric, setMetric] = useState('barrio'); const [leader, setLeader] = useState('')
  const [panorama, setPanorama] = useState('rango'); const [verTodos, setVerTodos] = useState(false)
  const alertasRef = useRef<HTMLElement>(null); const gestionRef = useRef<HTMLDivElement>(null)

  const lideres = useMemo(() => {
    const cedulas = new globalThis.Map<string, number>()
    for (const p of simpatizantesApi) cedulas.set(p.cedula, (cedulas.get(p.cedula) ?? 0) + 1)
    // Fuente única: las fichas con rol Líder. De public.lideres (por cédula) salen la meta,
    // el padrino y el equipo, porque los simpatizantes apuntan ahí con lider_id.
    const registros = new globalThis.Map(lideresApi.map((l) => [l.cedula, l]))
    const filas = simpatizantesApi.filter((p) => p.rol === 'lider').map((ficha) => {
      const registro = registros.get(ficha.cedula)
      const l = { id: registro?.id ?? ficha.id, nombres: ficha.nombres, apellidos: ficha.apellidos, padrinoId: registro?.padrinoId ?? ficha.trazabilidad?.padrino?.id ?? '', meta: registro?.meta ?? 0 }
      const equipo = registro ? simpatizantesApi.filter((p) => p.liderId === registro.id && p.id !== ficha.id) : []
      const validos = equipo.filter(esValido)
      const indecisos = validos.filter((p) => p.nivelVoto === 'Indeciso').length
      const telefonos = agrupar(equipo, (p) => p.telefono?.replace(/\D/g, '')).filter((t) => t.value > 1)
      const sinPuesto = equipo.filter((p) => !p.puesto || !p.mesa).length
      const motivos = [
        equipo.length - validos.length && `${equipo.length - validos.length} dato(s) fuera de circunscripción — revisar información`,
        sinPuesto && `${sinPuesto} simpatizante(s) sin puesto/mesa diligenciado`,
        telefonos.length && `${telefonos.length} teléfono(s) repetido(s) entre simpatizantes de su equipo`,
      ].filter(Boolean) as string[]
      return {
        id: l.id, nombre: `${l.nombres} ${l.apellidos}`, padrinoId: l.padrinoId, meta: l.meta, equipo, validos,
        invalidos: equipo.length - validos.length, pctIndecisos: pct(indecisos, validos.length),
        conflicto: equipo.filter((p) => (cedulas.get(p.cedula) ?? 0) > 1).length, motivos,
      }
    }).sort((a, b) => b.validos.length - a.validos.length || a.nombre.localeCompare(b.nombre))
    // Semáforo contra el promedio de votos válidos por líder en la campaña.
    const promedio = filas.length ? filas.reduce((s, f) => s + f.validos.length, 0) / filas.length : 0
    return filas.map((f) => ({ ...f, estado: f.validos.length >= promedio ? 'Verde' : f.validos.length >= promedio / 2 ? 'Amarillo' : 'Rojo' }))
  }, [lideresApi, simpatizantesApi])

  const actual = lideres.find((l) => l.id === leader) ?? lideres[0]
  const conAlertas = lideres.filter((l) => l.motivos.length)
  const semaforo = (e: string) => lideres.filter((l) => l.estado === e).length
  const conMeta = lideres.filter((l) => l.meta > 0)
  const cumplen = conMeta.filter((l) => l.validos.length >= l.meta).length

  const barras = useMemo(() => {
    if (!actual) return []
    const v = actual.validos
    if (metric === 'barrio') return agrupar(v, (p) => p.barrio).slice(0, 10)
    if (metric === 'corregimiento') return agrupar(v, (p) => p.corregimiento).slice(0, 10)
    if (metric === 'puesto') return agrupar(v, (p) => nombrePuesto(p.puesto)).slice(0, 10)
    if (metric === 'validez') {
      const firmes = v.filter((p) => p.nivelVoto === 'Firme').length
      return [{ label: 'Válidos', value: v.length }, { label: 'Inválidos', value: actual.invalidos }, { label: 'Firmes', value: firmes }, { label: 'Indecisos', value: v.length - firmes }]
    }
    return [{ label: 'Meta', value: actual.meta }, { label: 'Votos válidos', value: v.length }, { label: 'Faltan', value: Math.max(actual.meta - v.length, 0) }]
  }, [actual, metric])
  const maxBarra = Math.max(...barras.map((b) => b.value), 1)

  const panoramaData = useMemo(() => {
    if (panorama === 'rango') return RANGOS.map(([label, min, max]) => ({ label, value: lideres.filter((l) => l.validos.length >= min && l.validos.length <= max).length }))
    if (panorama === 'puesto') return agrupar(lideres.flatMap((l) => [...new Set(l.equipo.map((p) => nombrePuesto(p.puesto)).filter(Boolean))]), (x) => x).slice(0, 12)
    const padrinos = new globalThis.Map(usuariosApi.map((u) => [u.id, u.nombre]))
    return agrupar(lideres, (l) => padrinos.get(l.padrinoId) ?? 'Sin padrino').slice(0, 12)
  }, [panorama, lideres, usuariosApi])
  const maxPanorama = Math.max(...panoramaData.map((d) => d.value), 1)

  const verGestion = (m: string) => { setMetric(m); gestionRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  const vacio = (texto: string) => <p className="py-10 text-center text-sm text-gray-400">{cargandoLideres ? 'Cargando…' : texto}</p>

  return <main className="flex-1 overflow-y-auto p-6"><div className="mx-auto max-w-[1400px]"><div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Líder</h1><p className="text-sm text-gray-500">Dashboard y directorio — promueve o quita el rol desde la tabla</p><div className="mt-4 flex gap-6 border-b border-gray-200"><a className="border-b-2 border-blue-600 px-1 pb-3 text-sm font-medium text-blue-600">Dashboard</a><a onClick={() => navigate('lider-directorio')} className="cursor-pointer border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-gray-500">Directorio</a></div></div><div className="space-y-8">
    <section><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><Kpi title="Total de líderes" value={String(lideres.length)} icon="users" /><Kpi title="Circunscripción Inválida" value={`${lideres.filter((l) => l.invalidos).length} líder(es)`} icon="map" onClick={() => alertasRef.current?.scrollIntoView({ behavior: 'smooth' })} /><Kpi title="Cumplimiento de Metas" value={conMeta.length ? `${cumplen} de ${conMeta.length}` : 'Sin metas'} icon="flag" onClick={() => verGestion('avance')} /><Kpi title="Alerta de decisión" value={`${lideres.filter((l) => l.validos.some((p) => p.nivelVoto === 'Indeciso')).length} líder(es)`} icon="help" onClick={() => verGestion('validez')} /></div><div ref={gestionRef} className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-gray-800">Gestión individual del líder</p><p className="text-xs text-gray-400">{actual ? `Equipo de ${actual.equipo.length} simpatizante(s)${metric === 'validez' ? '' : ` — solo residentes de ${MUNICIPIO_CAMPANA}`}` : 'Sin líderes registrados'}</p></div><div className="flex flex-wrap gap-2"><select value={actual?.id ?? ''} onChange={e=>setLeader(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-xs">{lideres.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select><select value={metric} onChange={e=>setMetric(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-xs"><option value="barrio">Simpatizantes por barrio</option><option value="corregimiento">Simpatizantes por corregimiento</option><option value="puesto">Simpatizantes por puesto de votación</option><option value="validez">Validez y nivel de decisión</option><option value="avance">Avance de meta</option></select></div></div>{barras.length ? <div className="mt-4 space-y-2">{barras.map((b,i)=><div key={b.label} className="flex items-center gap-3 text-xs"><span className="w-36 shrink-0 text-right text-gray-500">{b.label}</span><div className="h-6 flex-1 rounded bg-gray-50"><div className="h-6 rounded" style={{width:`${b.value/maxBarra*100}%`, backgroundColor: coloresBarrios[i % coloresBarrios.length]}} /></div><span className="w-8 text-gray-500">{b.value}</span></div>)}</div> : vacio('Este líder aún no tiene simpatizantes para esta vista.')}</div></section>
    <section ref={alertasRef}><div className="mb-1 flex items-center gap-2"><p className="text-sm font-semibold text-gray-700">Alertas de calidad de dato</p><span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">{conAlertas.length}</span></div><p className="mb-3 text-xs text-gray-400">Vista general de los líderes con alguna alerta — incluye datos fuera de jurisdicción, puesto/mesa sin diligenciar y teléfonos duplicados.</p><div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase tracking-wide text-white"><tr><th className="px-4 py-2.5">Líder</th><th className="px-4 py-2.5 text-center">N°</th><th className="px-4 py-2.5">Motivos</th></tr></thead><tbody className="divide-y divide-gray-100">{conAlertas.length ? conAlertas.map((x)=><tr key={x.id}><td className="px-4 py-2.5 font-medium text-gray-800">{x.nombre}</td><td className="px-4 py-2.5 text-center"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{x.motivos.length}</span></td><td className="px-4 py-2.5 text-gray-600">{x.motivos.join(' · ')}</td></tr>) : <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">{cargandoLideres ? 'Cargando…' : 'Ningún líder tiene alertas de calidad de dato.'}</td></tr>}</tbody></table></div></section>
    <section><div className="mb-1 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-700">Ranking de Rendimiento de Líderes</p><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{semaforo('Verde')} Verde</span><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{semaforo('Amarillo')} Amarillo</span><span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">{semaforo('Rojo')} Rojo</span></div>{lideres.length > 10 && <button onClick={() => setVerTodos((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">{verTodos ? 'Ver solo los 10 primeros' : `Ver los ${lideres.length} líderes`} <ArrowRight className="h-3 w-3" /></button>}</div><p className="mb-3 text-xs text-gray-400">Ordenado por votos válidos aportados — el semáforo compara a cada líder contra el promedio de la campaña.</p><div className="overflow-x-auto rounded-xl border border-gray-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-gray-50 uppercase tracking-wide text-gray-500"><tr>{['#','Líder','Registrados','Válidos','Inválidos','% Indecisos','Conflicto','Estado'].map(h=><th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{lideres.length ? (verTodos ? lideres : lideres.slice(0, 10)).map((x,i)=><tr key={x.id} onClick={() => { setLeader(x.id); verGestion(metric) }} className="cursor-pointer hover:bg-gray-50"><td className="px-3 py-2 text-gray-600">{i+1}</td><td className="px-3 py-2 font-medium text-gray-900">{x.nombre}</td><td className="px-3 py-2 text-gray-600">{x.equipo.length}</td><td className="px-3 py-2 text-gray-600">{x.validos.length}</td><td className="px-3 py-2 text-gray-600">{x.invalidos}</td><td className="px-3 py-2 text-gray-600">{x.pctIndecisos}</td><td className="px-3 py-2 text-gray-600">{x.conflicto || '—'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${x.estado==='Verde'?'bg-emerald-50 text-emerald-700':x.estado==='Amarillo'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}`}>{x.estado}</span></td></tr>) : <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-400">{cargandoLideres ? 'Cargando…' : 'Aún no hay líderes registrados.'}</td></tr>}</tbody></table></div></section>
    <section><div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-gray-800">Panorama grupal de líderes</p><p className="text-xs text-gray-400">Cómo se agrupan los líderes según su desempeño — haz clic en una barra para ver el directorio</p></div><select value={panorama} onChange={e=>setPanorama(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1 text-xs"><option value="rango">Rango de votos</option><option value="puesto">Líderes por puesto de votación</option><option value="padrino">Por Padrino</option></select></div><p className="mb-1 mt-3 text-[11px] text-gray-400">Haz clic en una barra para ver el detalle.</p>{panoramaData.some((d) => d.value) ? <div className="flex h-72 items-end justify-between gap-2 border-b border-l border-gray-300 px-4 pt-4">{panoramaData.map(({label,value})=><button key={label} type="button" onClick={() => navigate('lider-directorio')} className="group flex h-full flex-1 flex-col items-center justify-end gap-2" title={`Líderes: ${value}`}><span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100">{value}</span><span className="w-full rounded-t bg-blue-600 transition hover:bg-blue-700" style={{height:`${value/maxPanorama*88+4}%`}} /><span className="w-16 -rotate-45 origin-top truncate text-[11px] text-gray-500">{label}</span></button>)}</div> : vacio('Sin datos para esta vista.')}<div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-600"><span className="h-3 w-3 rounded-sm bg-blue-600" /> Líderes</div></div></section>
  </div></div></main>
}
