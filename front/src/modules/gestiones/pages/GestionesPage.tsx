import { Filter, Search, X } from 'lucide-react'
import { confirmar } from '../../../components/ConfirmDialog'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../../store'
import { fmtCOP } from '../../../lib'
import { ROL_SIMPATIZANTE_LABEL } from '../../../types'
import type { GestionApi } from '../../../types'

const CATEGORIAS = ['Salud', 'Ayudas/Mercados', 'Obras comunitarias', 'Empleo', 'Trámites/Asesoría', 'Recursos/Dinero']
const ESTADOS = ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado']
const colors: Record<string, string> = { 'Salud': '#2563eb', 'Ayudas/Mercados': '#7c3aed', 'Obras comunitarias': '#0d9488', 'Empleo': '#f59e0b', 'Trámites/Asesoría': '#dc2626', 'Recursos/Dinero': '#059669' }
const PALETA = ['#2563eb', '#7c3aed', '#0d9488', '#f59e0b', '#dc2626', '#059669', '#db2777', '#4f46e5', '#65a30d', '#0891b2']
const PER_PAGE = 10
const selCls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500'

type Vista = 'categoria' | 'lider' | 'invertido' | 'responsable'
const VISTAS: [Vista, string][] = [['categoria', 'Gestiones por categoría'], ['lider', 'Gestiones por líder'], ['invertido', 'Invertido ($) por categoría'], ['responsable', 'Gestiones por responsable']]

export default function Gestiones() {
  const { gestionesApi, cargandoGestiones, cargarGestionesApi, lideresApi, cargarLideresApi, cargarSimpatizantesApi, openGestion, eliminarGestionApi, session } = useApp()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarGestionesApi(); void cargarLideresApi(); void cargarSimpatizantesApi() }, [])
  const [q, setQ] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)
  const [f, setF] = useState({ categoria: 'all', estado: 'all', responsable: 'all', conMonto: 'all', desde: '', hasta: '' })
  const [vista, setVista] = useState<Vista>('categoria')
  const [page, setPage] = useState(1)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const patch = (p: Partial<typeof f>) => { setF((x) => ({ ...x, ...p })); setPage(1) }
  const limpiar = () => { setF({ categoria: 'all', estado: 'all', responsable: 'all', conMonto: 'all', desde: '', hasta: '' }); setQ(''); setPage(1) }
  const activos = Object.values(f).filter((v) => v !== 'all' && v !== '').length

  const persona = (g: GestionApi) => (g.simpatizante ? `${g.simpatizante.nombres} ${g.simpatizante.apellidos}` : 'General / Campaña')
  const responsables = useMemo(() => [...new Set(gestionesApi.map((g) => g.responsable))].sort(), [gestionesApi])

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return gestionesApi.filter((g) =>
      (f.categoria === 'all' || g.categoria === f.categoria)
      && (f.estado === 'all' || g.estado === f.estado)
      && (f.responsable === 'all' || g.responsable === f.responsable)
      && (f.conMonto === 'all' || (f.conMonto === 'si' ? g.monto > 0 : g.monto === 0))
      && (!f.desde || g.fecha >= f.desde) && (!f.hasta || g.fecha <= f.hasta)
      && (!t || `${g.descripcion} ${persona(g)} ${g.responsable}`.toLowerCase().includes(t)),
    ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn))
  }, [gestionesApi, f, q])

  const abiertas = filtradas.filter((g) => g.estado === 'Pendiente' || g.estado === 'En Proceso').length
  const resueltas = filtradas.filter((g) => g.estado === 'Resuelto').length
  const invertido = filtradas.reduce((s, g) => s + (g.estado === 'Cancelado' ? 0 : g.monto), 0)

  const cats = useMemo(() => {
    const suma = new globalThis.Map<string, number>()
    const add = (k: string, v: number) => suma.set(k, (suma.get(k) ?? 0) + v)
    const lideres = new globalThis.Map(lideresApi.map((l) => [l.id, `${l.nombres} ${l.apellidos}`]))
    for (const g of filtradas) {
      if (vista === 'categoria') add(g.categoria, 1)
      else if (vista === 'invertido') { if (g.estado !== 'Cancelado' && g.monto > 0) add(g.categoria, g.monto) }
      else if (vista === 'responsable') add(g.responsable, 1)
      else add(g.simpatizante?.liderId ? lideres.get(g.simpatizante.liderId) ?? 'Líder sin nombre' : 'Sin líder (general)', 1)
    }
    const total = [...suma.values()].reduce((s, v) => s + v, 0)
    return [...suma].sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
      label, value, pct: total ? Math.round((value / total) * 100) : 0, color: colors[label] ?? PALETA[i % PALETA.length],
    }))
  }, [filtradas, vista, lideresApi])
  let acumulado = 0
  const gradiente = cats.length
    ? `conic-gradient(${cats.map((c) => { const desde = acumulado; acumulado += c.pct; return `${c.color} ${desde}% ${c === cats[cats.length - 1] ? 100 : acumulado}%` }).join(', ')})`
    : '#f3f4f6'

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const pagina = filtradas.slice((current - 1) * PER_PAGE, current * PER_PAGE)
  const paginas = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - current) <= 2)
  const puedeGestionar = session?.rol === 'admin' || session?.rol === 'padrino'

  const eliminar = async (g: GestionApi) => {
    if (!(await confirmar({ titulo: 'Eliminar gestión', mensaje: `Se eliminará «${g.descripcion}». Esta acción no se puede deshacer.`, confirmar: 'Eliminar', tono: 'peligro' }))) return
    setEliminandoId(g.id)
    try { await eliminarGestionApi(g.id) } finally { setEliminandoId(null) }
  }

  return <main className="flex-1 overflow-y-auto p-6"><div><div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Trazabilidad de Gestiones</h1><p className="text-sm text-gray-500">Favores, compromisos y balance de lo invertido por la campaña</p></div>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-1 flex-wrap items-center gap-2"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Buscar descripción, persona o responsable..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" /></div><button onClick={() => setShowFiltros((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${showFiltros || activos ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-700'}`}><Filter className="h-4 w-4" /> Filtros{activos > 0 && <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{activos}</span>}</button>{(activos > 0 || q) && <button onClick={limpiar} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"><X className="h-4 w-4" /> Limpiar</button>}</div>{puedeGestionar && <button onClick={() => openGestion({ mode: 'new' })} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Nueva gestión</button>}</div>
    {showFiltros && <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-6">
      <label className="text-xs font-medium text-gray-600">Categoría<select className={`${selCls} mt-1 w-full`} value={f.categoria} onChange={(e) => patch({ categoria: e.target.value })}><option value="all">Todas</option>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs font-medium text-gray-600">Estado<select className={`${selCls} mt-1 w-full`} value={f.estado} onChange={(e) => patch({ estado: e.target.value })}><option value="all">Todos</option>{ESTADOS.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs font-medium text-gray-600">Responsable<select className={`${selCls} mt-1 w-full`} value={f.responsable} onChange={(e) => patch({ responsable: e.target.value })}><option value="all">Todos</option>{responsables.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-xs font-medium text-gray-600">Monto<select className={`${selCls} mt-1 w-full`} value={f.conMonto} onChange={(e) => patch({ conMonto: e.target.value })}><option value="all">Todos</option><option value="si">Con inversión</option><option value="no">Sin inversión</option></select></label>
      <label className="text-xs font-medium text-gray-600">Desde<input type="date" className={`${selCls} mt-1 w-full`} value={f.desde} onChange={(e) => patch({ desde: e.target.value })} /></label>
      <label className="text-xs font-medium text-gray-600">Hasta<input type="date" className={`${selCls} mt-1 w-full`} value={f.hasta} onChange={(e) => patch({ hasta: e.target.value })} /></label>
    </div>}
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Gestiones (filtro)', String(filtradas.length), 'text-gray-900', () => patch({ estado: 'all' })], ['Pendientes / en proceso', String(abiertas), 'text-amber-600', () => patch({ estado: 'Pendiente' })], ['Resueltas', String(resueltas), 'text-emerald-600', () => patch({ estado: 'Resuelto' })], ['Total invertido', fmtCOP(invertido), 'text-gray-900', () => setVista('invertido')]].map(([t, v, c, onClick]) => <div key={t as string} onClick={onClick as () => void} className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t as string}</p><p className={`mt-2 text-2xl font-semibold ${c}`}>{cargandoGestiones && !gestionesApi.length ? '…' : v as string}</p></div>)}</div>
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold text-gray-800">{VISTAS.find(([k]) => k === vista)?.[1]}</p><select value={vista} onChange={(e) => setVista(e.target.value as Vista)} className="rounded-lg border border-gray-300 px-2 py-1 text-xs">{VISTAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      {cats.length ? <div className="mt-3 flex flex-wrap items-center gap-8"><div className="h-40 w-40 shrink-0 rounded-full p-[20%]" style={{ background: gradiente }}><div className="h-full w-full rounded-full bg-white" /></div><ul className="flex-1 space-y-1.5 text-sm">{cats.map((c) => <li key={c.label} onClick={() => vista === 'categoria' || vista === 'invertido' ? patch({ categoria: c.label }) : vista === 'responsable' ? patch({ responsable: c.label }) : undefined} className="flex max-w-sm cursor-pointer items-center justify-between gap-2 hover:opacity-75"><span className="flex items-center gap-2 text-gray-600"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />{c.label}</span><span className="whitespace-nowrap font-medium text-gray-900">{vista === 'invertido' ? fmtCOP(c.value) : c.value} <span className="text-gray-400">({c.pct}%)</span></span></li>)}</ul></div> : <p className="py-10 text-center text-sm text-gray-400">{cargandoGestiones ? 'Cargando…' : 'Sin gestiones para esta vista.'}</p>}
    </div>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>{['Fecha', 'Persona', 'Categoría', 'Descripción', 'Monto', 'Estado', 'Responsable', ''].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">
      {pagina.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">{cargandoGestiones ? 'Cargando gestiones…' : 'Sin gestiones para los filtros aplicados.'}</td></tr>}
      {pagina.map((g) => <tr key={g.id} className="hover:bg-gray-50"><td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{g.fecha}</td><td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">{persona(g)} {g.simpatizante && <span className="text-xs font-normal text-gray-400">({ROL_SIMPATIZANTE_LABEL[g.simpatizante.rol ?? 'simpatizante']})</span>}</td><td className="px-4 py-2.5"><span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${colors[g.categoria]}18`, color: colors[g.categoria] }}>{g.categoria}</span></td><td className="max-w-xs px-4 py-2.5 text-gray-600">{g.descripcion}</td><td className="whitespace-nowrap px-4 py-2.5 text-gray-700">{g.monto > 0 ? fmtCOP(g.monto) : '—'}</td><td className="px-4 py-2.5"><span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${g.estado === 'Resuelto' ? 'bg-emerald-50 text-emerald-700' : g.estado === 'En Proceso' ? 'bg-amber-50 text-amber-700' : g.estado === 'Cancelado' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>{g.estado}</span></td><td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{g.responsable}</td><td className="whitespace-nowrap px-4 py-2.5 text-right">{puedeGestionar && <><button onClick={() => openGestion({ mode: 'edit', gestionId: g.id })} className="mr-3 text-xs font-medium text-blue-600 hover:underline">Editar</button><button disabled={eliminandoId === g.id} onClick={() => void eliminar(g)} className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Eliminar</button></>}</td></tr>)}
    </tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 text-sm"><p className="text-gray-500">Mostrando <span className="font-medium text-gray-900">{filtradas.length ? (current - 1) * PER_PAGE + 1 : 0}-{Math.min(current * PER_PAGE, filtradas.length)}</span> de <span className="font-medium text-gray-900">{filtradas.length}</span> registros</p><div className="flex gap-1"><button disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-600 disabled:text-gray-400 disabled:opacity-60">Anterior</button>{paginas.map((n, i) => <span key={n} className="flex">{i > 0 && n - paginas[i - 1] > 1 && <span className="px-1 py-1.5 text-gray-400">…</span>}<button onClick={() => setPage(n)} className={`min-w-[2rem] rounded-md px-2.5 py-1.5 ${n === current ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600'}`}>{n}</button></span>)}<button disabled={current === totalPages} onClick={() => setPage(current + 1)} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-gray-600 disabled:text-gray-400 disabled:opacity-60">Siguiente</button></div></div></div>
  </div></main>
}
