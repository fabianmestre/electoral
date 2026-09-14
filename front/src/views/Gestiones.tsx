import { useEffect, useMemo, useState } from 'react'
import { Filter, Plus, Search, Trash2, X } from 'lucide-react'
import { useApp } from '../store'
import { CATEGORIAS } from '../data'
import { fmtCOP, fmtFecha } from '../lib'
import { Badge, Bars, Card, Donut, estadoTone, Legend } from '../components/ui'

const CAT_COLORS: Record<string, string> = {
  Salud: '#6366f1',
  Empleo: '#10b981',
  'Ayudas/Mercados': '#f59e0b',
  'Recursos/Dinero': '#ef4444',
  'Trámites/Asesoría': '#0ea5e9',
  'Obras comunitarias': '#8b5cf6',
}
const EST_COLORS: Record<string, string> = {
  Resuelto: '#10b981',
  'En Proceso': '#f59e0b',
  Pendiente: '#3b82f6',
  Cancelado: '#94a3b8',
}
const PALETA = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6']
const RESP_PALETA = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316']
const ESTADOS = ['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado']

export default function Gestiones() {
  const {
    gestionesApi, cargandoGestiones, cargarGestionesApi, lideresApi, openGestion, eliminarGestionApi,
    verSimpatizanteDetalle, liderFilter, setLiderFilter, gestionesPreset, clearGestionesPreset,
  } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [est, setEst] = useState('all')
  const [responsable, setResponsable] = useState('all')
  const [conMonto, setConMonto] = useState('all')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const nombreLiderApi = (id: string) => {
    const l = lideresApi.find((x) => x.id === id)
    return l ? `${l.nombres} ${l.apellidos}` : '—'
  }

  useEffect(() => {
    void cargarGestionesApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (gestionesPreset) {
      if (gestionesPreset.estado) setEst(gestionesPreset.estado)
      if (gestionesPreset.conMonto) setConMonto(gestionesPreset.conMonto)
      clearGestionesPreset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestionesPreset])

  const responsables = useMemo(() => [...new Set(gestionesApi.map((g) => g.responsable))].sort(), [gestionesApi])

  const lista = useMemo(() => {
    let l = [...gestionesApi].sort((a, b) => b.fecha.localeCompare(a.fecha))
    if (liderFilter !== 'all') l = l.filter((g) => g.simpatizante?.liderId === liderFilter)
    if (cat !== 'all') l = l.filter((g) => g.categoria === cat)
    if (est !== 'all') l = l.filter((g) => g.estado === est)
    if (responsable !== 'all') l = l.filter((g) => g.responsable === responsable)
    if (conMonto === 'con') l = l.filter((g) => Number(g.monto) > 0)
    if (conMonto === 'sin') l = l.filter((g) => Number(g.monto) === 0)
    if (desde) l = l.filter((g) => g.fecha >= desde)
    if (hasta) l = l.filter((g) => g.fecha <= hasta)
    if (q.trim()) {
      const t = q.trim().toLowerCase()
      l = l.filter((g) => {
        const p = g.simpatizante
        return `${g.descripcion} ${g.responsable} ${p?.nombres ?? ''} ${p?.apellidos ?? ''} ${p?.cedula ?? ''}`.toLowerCase().includes(t)
      })
    }
    return l
  }, [gestionesApi, liderFilter, cat, est, responsable, conMonto, desde, hasta, q])

  const totalInv = lista.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const resueltos = lista.filter((g) => g.estado === 'Resuelto').length
  const pendientes = lista.filter((g) => g.estado === 'Pendiente' || g.estado === 'En Proceso').length

  const donaCat = CATEGORIAS.map((c) => ({ label: c, value: lista.filter((g) => g.categoria === c).length, color: CAT_COLORS[c] }))
  const donaEst = ESTADOS.map((e) => ({ label: e, value: lista.filter((g) => g.estado === e).length, color: EST_COLORS[e] }))
  const barrasLider = lideresApi.map((l, i) => ({
    label: l.nombres,
    value: lista.filter((g) => g.simpatizante?.liderId === l.id).length,
    color: PALETA[i % PALETA.length],
  }))
  const montosCat = CATEGORIAS.map((c) => ({
    label: c,
    monto: lista.filter((g) => g.categoria === c).reduce((s, g) => s + (Number(g.monto) || 0), 0),
    color: CAT_COLORS[c],
  }))
  const barrasResp = responsables.map((r, i) => ({
    label: r,
    value: lista.filter((g) => g.responsable === r).length,
    color: RESP_PALETA[i % RESP_PALETA.length],
  }))
  const maxResp = Math.max(...barrasResp.map((r) => r.value), 1)

  const balances = useMemo(() => {
    const porPersona = new Map<string, { p: { id: string; nombres: string; apellidos: string }; tot: number }>()
    for (const g of gestionesApi) {
      if (!g.simpatizante || !Number(g.monto)) continue
      const actual = porPersona.get(g.simpatizante.id)
      if (actual) actual.tot += Number(g.monto)
      else porPersona.set(g.simpatizante.id, { p: g.simpatizante, tot: Number(g.monto) })
    }
    return [...porPersona.values()].sort((a, b) => b.tot - a.tot).slice(0, 6)
  }, [gestionesApi])
  const maxBalance = balances[0]?.tot || 1

  const chips = useMemo(() => {
    const c: { key: string; label: string; value: string }[] = []
    if (liderFilter !== 'all') c.push({ key: 'lider', label: 'Líder', value: nombreLiderApi(liderFilter) })
    if (cat !== 'all') c.push({ key: 'cat', label: 'Categoría', value: cat })
    if (est !== 'all') c.push({ key: 'est', label: 'Estado', value: est })
    if (responsable !== 'all') c.push({ key: 'resp', label: 'Responsable', value: responsable })
    if (conMonto !== 'all') c.push({ key: 'monto', label: 'Monto', value: conMonto === 'con' ? 'Con valor ($)' : 'Sin valor' })
    if (desde) c.push({ key: 'desde', label: 'Desde', value: fmtFecha(desde) })
    if (hasta) c.push({ key: 'hasta', label: 'Hasta', value: fmtFecha(hasta) })
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liderFilter, cat, est, responsable, conMonto, desde, hasta, lideresApi])

  const removeChip = (key: string) => {
    if (key === 'lider') setLiderFilter('all')
    else if (key === 'cat') setCat('all')
    else if (key === 'est') setEst('all')
    else if (key === 'resp') setResponsable('all')
    else if (key === 'monto') setConMonto('all')
    else if (key === 'desde') setDesde('')
    else if (key === 'hasta') setHasta('')
  }

  const limpiarFiltros = () => {
    setLiderFilter('all')
    setCat('all')
    setEst('all')
    setResponsable('all')
    setConMonto('all')
    setDesde('')
    setHasta('')
    setQ('')
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta gestión?')) return
    setEliminandoId(id)
    try {
      await eliminarGestionApi(id)
    } finally {
      setEliminandoId(null)
    }
  }

  const selCls = 'w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'

  return (
    <div>
      {/* Barra superior */}
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descripción, persona o responsable..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFiltros((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
            showFiltros || chips.length > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" /> Filtros
          {chips.length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
              {chips.length}
            </span>
          )}
        </button>
        {chips.length > 0 && (
          <button onClick={limpiarFiltros} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" /> Limpiar
          </button>
        )}
        <div className="ml-auto inline-flex items-center gap-1 text-sm text-slate-600">
          <Filter className="w-4 h-4" /> Total invertido: <b className="text-amber-700">{fmtCOP(totalInv)}</b>
        </div>
        <button onClick={() => openGestion({ mode: 'new' })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nueva gestión
        </button>
      </div>

      {/* Chips de filtros activos */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeChip(c.key)}
              className="inline-flex items-center gap-1 text-[11px] bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2.5 py-1 hover:bg-blue-100"
              title="Quitar filtro"
            >
              {c.label}: <b>{c.value}</b> <X className="w-3 h-3" />
            </button>
          ))}
          <button onClick={limpiarFiltros} className="text-[11px] text-slate-500 hover:text-slate-700 underline self-center">
            Limpiar todo
          </button>
        </div>
      )}

      {/* Panel de filtros */}
      {showFiltros && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Líder</label>
              <select className={selCls} value={liderFilter} onChange={(e) => setLiderFilter(e.target.value)}>
                <option value="all">Todos</option>
                {lideresApi.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombres} {l.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Categoría</label>
              <select className={selCls} value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="all">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Estado</label>
              <select className={selCls} value={est} onChange={(e) => setEst(e.target.value)}>
                <option value="all">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Responsable</label>
              <select className={selCls} value={responsable} onChange={(e) => setResponsable(e.target.value)}>
                <option value="all">Todos</option>
                {responsables.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Monto</label>
              <select className={selCls} value={conMonto} onChange={(e) => setConMonto(e.target.value)}>
                <option value="all">Con o sin monto</option>
                <option value="con">Con valor ($)</option>
                <option value="sin">Sin valor</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Desde</label>
              <input type="date" className={selCls} value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Hasta</label>
              <input type="date" className={selCls} value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-extrabold text-blue-600">{lista.length}</div>
          <div className="text-[11px] text-slate-500 font-medium">Gestiones (filtro)</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-extrabold text-emerald-600">{resueltos}</div>
          <div className="text-[11px] text-slate-500 font-medium">Resueltas</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-extrabold text-amber-600">{pendientes}</div>
          <div className="text-[11px] text-slate-500 font-medium">Pendientes / en proceso</div>
        </div>
      </div>

      {/* 6 gráficas (3 por fila) */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Card title="Gestiones por categoría">
          <div className="w-32 h-32 mx-auto">
            <Donut data={donaCat} />
          </div>
          <Legend data={donaCat} />
        </Card>
        <Card title="Gestiones por estado">
          <div className="w-32 h-32 mx-auto">
            <Donut data={donaEst} />
          </div>
          <Legend data={donaEst} />
        </Card>
        <Card title="Gestiones por líder">
          <Bars data={barrasLider} />
        </Card>
        <Card title="Invertido ($) por categoría">
          <div className="space-y-2.5">
            {montosCat.map((c) => {
              const pct = totalInv ? (c.monto / totalInv) * 100 : 0
              return (
                <div key={c.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600 truncate">{c.label}</span>
                    <span className="font-semibold text-amber-700 shrink-0">{fmtCOP(c.monto)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
        <Card title="💰 Balance por persona (top 6)">
          <div className="space-y-2.5">
            {balances.length === 0 && <p className="text-sm text-slate-400">Sin montos registrados.</p>}
            {balances.map((b) => (
              <div key={b.p.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <button onClick={() => verSimpatizanteDetalle(b.p.id)} className="text-slate-600 hover:text-blue-600 truncate text-left flex-1">
                    {b.p.nombres} {b.p.apellidos}
                  </button>
                  <span className="font-semibold text-amber-700 shrink-0">{fmtCOP(b.tot)}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(b.tot / maxBalance) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Gestiones por responsable">
          <div className="space-y-2.5">
            {barrasResp.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 truncate">{r.label}</span>
                  <span className="font-semibold text-slate-700 shrink-0">{r.value}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${(r.value / maxResp) * 100}%`, backgroundColor: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Fecha', 'Persona', 'Categoría', 'Descripción', 'Monto', 'Estado', 'Responsable', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-slate-400 text-sm text-center">
                    {cargandoGestiones ? 'Cargando gestiones…' : 'Sin gestiones para los filtros aplicados.'}
                  </td>
                </tr>
              )}
              {lista.map((g) => {
                const p = g.simpatizante
                return (
                  <tr key={g.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-3 py-2.5 text-sm font-medium whitespace-nowrap">{fmtFecha(g.fecha)}</td>
                    <td className="px-3 py-2.5 text-sm">
                      {p ? (
                        <>
                          <button onClick={() => verSimpatizanteDetalle(p.id)} className="text-left text-blue-600 hover:underline font-medium">
                            {p.nombres} {p.apellidos}
                          </button>
                          <div className="text-[10px] text-slate-400">
                            CC {p.cedula} · {nombreLiderApi(p.liderId)}
                          </div>
                        </>
                      ) : (
                        <span className="font-medium text-slate-500">General / Campaña</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className="bg-slate-100 text-slate-700">{g.categoria}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs">{g.descripcion}</td>
                    <td className={`px-3 py-2.5 font-semibold ${Number(g.monto) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {Number(g.monto) > 0 ? fmtCOP(g.monto) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={estadoTone(g.estado)}>{g.estado}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{g.responsable}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button onClick={() => openGestion({ mode: 'edit', gestionId: g.id })} className="text-xs text-blue-600 hover:underline">
                        Editar
                      </button>
                      <button
                        onClick={() => void eliminar(g.id)}
                        disabled={eliminandoId === g.id}
                        className="text-xs text-red-500 hover:underline ml-2 inline-flex items-center gap-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
