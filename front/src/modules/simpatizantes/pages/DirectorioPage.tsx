import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Filter, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useApp } from '../../../store'
import {
  BARRIOS,
  COMUNAS,
  CORREGIMIENTOS,
  DEPARTAMENTO_CAMPANA,
  DEPARTAMENTOS,
  GRUPOS_SOCIALES,
  INTERESES,
  MUNICIPIO_CAMPANA,
  MUNICIPIOS,
  NIVELES_ACADEMICOS,
  POSGRADOS,
  PROFESIONES,
  PUESTOS,
  barriosDeFiltro,
  comunasDeMunicipio,
  corregimientosDeMunicipio,
  municipiosDeDepartamento,
  puestosDeBarrio,
} from '../../../data'
import type { SimpatizanteApi, Validez } from '../../../types'
import { Badge, nivelAcademicoTone, nivelTone } from '../../../components/ui'

const esValidoApi = (p: SimpatizanteApi) => p.departamento === DEPARTAMENTO_CAMPANA && p.municipio === MUNICIPIO_CAMPANA
const validezDeApi = (p: SimpatizanteApi): Validez => {
  if (esValidoApi(p)) return 'valido'
  if (p.departamento === DEPARTAMENTO_CAMPANA) return 'fuera_municipio'
  return 'fuera_departamento'
}

const PER_PAGE = 50

interface Filtros {
  q: string
  liderId: string
  departamento: string
  municipio: string
  zona: string
  comuna: string
  corregimiento: string
  barrio: string
  puesto: string
  mesa: string
  nivelVoto: string
  validez: string
  tieneVehiculo: string
  tipoVehiculo: string
  rolDiaE: string
  interes: string
  grupoSocial: string
  profesion: string
  nivelAcademico: string
  posgrado: string
}

const DEFAULT_F: Filtros = {
  q: '',
  liderId: 'all',
  departamento: 'all',
  municipio: 'all',
  zona: 'all',
  comuna: 'all',
  corregimiento: 'all',
  barrio: 'all',
  puesto: 'all',
  mesa: 'all',
  nivelVoto: 'all',
  validez: 'all',
  tieneVehiculo: 'all',
  tipoVehiculo: 'all',
  rolDiaE: 'all',
  interes: 'all',
  grupoSocial: 'all',
  profesion: 'all',
  nivelAcademico: 'all',
  posgrado: 'all',
}

const selCls = 'w-full mt-1 border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function paginas(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)
  return pages
}

export default function Directorio() {
  const {
    session, openPersona, liderFilter, setLiderFilter, directorioPreset, clearDirectorioPreset,
    borrarTodosSimpatizantes, simpatizantesApi, lideresApi, cargandoSimpatizantes, cargarSimpatizantesApi,
    verSimpatizanteDetalle, eliminarSimpatizante,
  } = useApp()
  const [filtros, setFiltros] = useState<Filtros>({ ...DEFAULT_F, liderId: liderFilter })
  const [showFiltros, setShowFiltros] = useState(false)
  const [page, setPage] = useState(1)
  const [borrando, setBorrando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const puedeGestionar = session?.rol === 'admin' || session?.rol === 'padrino' || session?.rol === 'gestor'
  const puedeEliminar = session?.rol === 'admin' || session?.rol === 'padrino'
  const validezLabel = (p: SimpatizanteApi) => validezDeApi(p) === 'valido' ? 'Válido' : 'Inválido'
  const rolLabel = (p: SimpatizanteApi) => p.trazabilidad?.padrino ? 'Líder' : p.trazabilidad?.lider ? 'Padrino' : 'Candidato'

  const eliminarFicha = async (p: { id: string; nombres: string; apellidos: string }) => {
    if (!window.confirm(`¿Eliminar la ficha de ${p.nombres} ${p.apellidos}? Esta acción no se puede deshacer.`)) return
    setEliminandoId(p.id)
    try {
      await eliminarSimpatizante(p.id)
    } finally {
      setEliminandoId(null)
    }
  }
  const nombreLiderApi = (id: string) => {
    const l = lideresApi.find((x) => x.id === id)
    return l ? `${l.nombres} ${l.apellidos}` : '—'
  }

  useEffect(() => {
    void cargarSimpatizantesApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const borrarTodos = async () => {
    if (!window.confirm('¿Borrar TODOS los simpatizantes guardados en el backend (Supabase)? Esta acción no se puede deshacer.')) return
    setBorrando(true)
    try {
      await borrarTodosSimpatizantes()
    } finally {
      setBorrando(false)
    }
  }

  const patch = (p: Partial<Filtros>) => {
    setFiltros((f) => ({ ...f, ...p }))
    setPage(1)
  }
  const setLider = (v: string) => {
    setLiderFilter(v)
    patch({ liderId: v })
  }
  const limpiar = () => {
    setFiltros({ ...DEFAULT_F })
    setLiderFilter('all')
    setPage(1)
  }

  const patchGeo = (partial: Partial<Filtros>, resets: string[]) => {
    const reset: Record<string, string> = {}
    resets.forEach((k) => (reset[k] = 'all'))
    setFiltros((f) => ({ ...f, ...partial, ...reset } as Filtros))
    setPage(1)
  }
  const setDepartamento = (v: string) => patchGeo({ departamento: v }, ['municipio', 'zona', 'comuna', 'corregimiento', 'barrio', 'puesto'])
  const setMunicipio = (v: string) => patchGeo({ municipio: v }, ['zona', 'comuna', 'corregimiento', 'barrio', 'puesto'])
  const setZona = (v: string) => patchGeo({ zona: v }, ['comuna', 'corregimiento', 'barrio', 'puesto'])
  const setComuna = (v: string) => patchGeo({ comuna: v }, ['corregimiento', 'barrio', 'puesto'])
  const setCorregimiento = (v: string) => patchGeo({ corregimiento: v }, ['comuna', 'barrio', 'puesto'])
  const setBarrio = (v: string) => patchGeo({ barrio: v }, ['puesto'])

  const removeFilter = (k: keyof Filtros) => {
    setFiltros((f) => ({ ...f, [k]: 'all' } as Filtros))
    setPage(1)
    if (k === 'liderId') setLiderFilter('all')
  }

  useEffect(() => {
    if (directorioPreset) {
      const partial: Partial<Filtros> = {}
      if (directorioPreset.liderId) partial.liderId = directorioPreset.liderId
      if (directorioPreset.validez) partial.validez = directorioPreset.validez
      if (directorioPreset.nivelVoto) partial.nivelVoto = directorioPreset.nivelVoto
      if (directorioPreset.puesto) partial.puesto = directorioPreset.puesto
      if (directorioPreset.mesa !== undefined) partial.mesa = String(directorioPreset.mesa)
      patch(partial)
      clearDirectorioPreset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directorioPreset])

  const filtered = useMemo(() => {
    let l = simpatizantesApi.slice()
    const f = filtros
    if (f.liderId !== 'all') l = l.filter((p) => p.liderId === f.liderId)
    if (f.departamento !== 'all') l = l.filter((p) => p.departamento === f.departamento)
    if (f.municipio !== 'all') l = l.filter((p) => p.municipio === f.municipio)
    if (f.zona !== 'all') l = l.filter((p) => p.zona === f.zona)
    if (f.comuna !== 'all') l = l.filter((p) => p.comuna === f.comuna)
    if (f.corregimiento !== 'all') l = l.filter((p) => p.corregimiento === f.corregimiento)
    if (f.barrio !== 'all') l = l.filter((p) => p.barrio === f.barrio)
    if (f.puesto !== 'all') l = l.filter((p) => p.puesto === f.puesto)
    if (f.mesa !== 'all' && f.mesa !== '') l = l.filter((p) => p.mesa === Number(f.mesa))
    if (f.nivelVoto !== 'all') l = l.filter((p) => p.nivelVoto === f.nivelVoto)
    if (f.validez === 'valido') l = l.filter((p) => esValidoApi(p))
    if (f.validez === 'invalido') l = l.filter((p) => !esValidoApi(p))
    if (f.validez === 'fuera_municipio') l = l.filter((p) => validezDeApi(p) === 'fuera_municipio')
    if (f.validez === 'fuera_departamento') l = l.filter((p) => validezDeApi(p) === 'fuera_departamento')
    if (f.tieneVehiculo === 'si') l = l.filter((p) => p.vehiculos.length > 0)
    if (f.tieneVehiculo === 'no') l = l.filter((p) => p.vehiculos.length === 0)
    if (f.tipoVehiculo !== 'all') l = l.filter((p) => p.vehiculos.some((v) => v.tipo === f.tipoVehiculo))
    if (f.rolDiaE !== 'all') l = l.filter((p) => p.rolDiaE === f.rolDiaE)
    if (f.interes !== 'all') l = l.filter((p) => p.intereses.includes(f.interes))
    if (f.grupoSocial !== 'all') l = l.filter((p) => p.gruposSociales.includes(f.grupoSocial))
    if (f.profesion !== 'all') l = l.filter((p) => p.profesion === f.profesion)
    if (f.nivelAcademico !== 'all') l = l.filter((p) => p.nivelAcademico === f.nivelAcademico)
    if (f.posgrado !== 'all') l = l.filter((p) => p.posgrado === f.posgrado)
    if (f.q.trim()) {
      const q = f.q.trim().toLowerCase()
      l = l.filter((p) =>
        `${p.nombres} ${p.apellidos} ${p.cedula} ${p.barrio} ${p.municipio} ${p.comuna ?? ''} ${p.corregimiento ?? ''} ${p.telefono} ${p.correo ?? ''}`
          .toLowerCase()
          .includes(q),
      )
    }
    return l.sort((a, b) => a.nombres.localeCompare(b.nombres))
  }, [simpatizantesApi, filtros])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const paginado = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const activos =
    Object.entries(filtros).filter(([k, v]) => k !== 'q' && v !== 'all' && v !== '').length + (filtros.q.trim() ? 1 : 0)

  const muns = filtros.departamento === 'all' ? MUNICIPIOS : municipiosDeDepartamento(filtros.departamento)
  const comunas = filtros.municipio === 'all' ? COMUNAS : comunasDeMunicipio(filtros.municipio)
  const corregimientos = filtros.municipio === 'all' ? CORREGIMIENTOS : corregimientosDeMunicipio(filtros.municipio)
  const barrios = filtros.municipio === 'all' ? BARRIOS : barriosDeFiltro(filtros.municipio, filtros.comuna, filtros.corregimiento)
  const puestos =
    filtros.municipio === 'all'
      ? PUESTOS
      : filtros.barrio !== 'all'
        ? puestosDeBarrio(filtros.municipio, filtros.barrio)
        : PUESTOS.filter((p) => p.municipio === filtros.municipio)

  const activeChips = useMemo(() => {
    const LABELS: Record<string, string> = {
      liderId: 'Líder', departamento: 'Depto', municipio: 'Municipio', zona: 'Zona',
      comuna: 'Comuna', corregimiento: 'Corregimiento', barrio: 'Barrio', puesto: 'Puesto', mesa: 'Mesa',
      nivelVoto: 'Nivel de voto', validez: 'Validez', tieneVehiculo: 'Vehículo', tipoVehiculo: 'Tipo vehículo',
      rolDiaE: 'Rol Día E', interes: 'Interés', grupoSocial: 'Grupo social', profesion: 'Profesión',
      nivelAcademico: 'Nivel académico', posgrado: 'Posgrado',
    }
    const VAL_LABEL: Record<string, string> = { valido: 'Válido', invalido: 'Inválidos', fuera_municipio: 'Fuera de municipio', fuera_departamento: 'Fuera de departamento' }
    const chips: { key: keyof Filtros; label: string; value: string }[] = []
    Object.entries(filtros).forEach(([k, v]) => {
      if (k === 'q' || v === 'all' || v === '') return
      let val = v
      if (k === 'liderId') val = nombreLiderApi(v)
      else if (k === 'puesto') val = PUESTOS.find((p) => p.id === v)?.nombre ?? v
      else if (k === 'tieneVehiculo') val = v === 'si' ? 'Sí' : 'No'
      else if (k === 'validez') val = VAL_LABEL[v] ?? v
      chips.push({ key: k as keyof Filtros, label: LABELS[k] ?? k, value: val })
    })
    return chips
  }, [filtros, lideresApi])

  return (
    <div>
      {/* Barra superior */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filtros.q}
            onChange={(e) => patch({ q: e.target.value })}
            placeholder="Buscar por nombre, cédula, teléfono, barrio, correo..."
            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFiltros((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
            showFiltros || activos > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter className="w-4 h-4" /> Filtros
          {activos > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
              {activos}
            </span>
          )}
        </button>
        {activos > 0 && (
          <button onClick={limpiar} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" /> Limpiar
          </button>
        )}
        <button type="button" className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Columnas (16)
        </button>
        {session?.rol !== 'gestor' && <button onClick={() => openPersona({ mode: 'new' })} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="w-4 h-4" /> + Nuevo Simpatizante
        </button>}
      </div>

      {/* Chips de filtros activos */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeFilter(c.key)}
              className="inline-flex items-center gap-1 text-[11px] bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-2.5 py-1 hover:bg-blue-100"
              title="Quitar filtro"
            >
              {c.label}: <b>{c.value}</b> <X className="w-3 h-3" />
            </button>
          ))}
          <button onClick={limpiar} className="text-[11px] text-slate-500 hover:text-slate-700 underline self-center">
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
              <select className={selCls} value={filtros.liderId} onChange={(e) => setLider(e.target.value)}>
                <option value="all">Todos</option>
                {lideresApi.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombres} {l.apellidos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Departamento</label>
              <select className={selCls} value={filtros.departamento} onChange={(e) => setDepartamento(e.target.value)}>
                <option value="all">Todos</option>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Municipio</label>
              <select className={selCls} value={filtros.municipio} onChange={(e) => setMunicipio(e.target.value)}>
                <option value="all">Todos</option>
                {muns.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Zona</label>
              <select className={selCls} value={filtros.zona} onChange={(e) => setZona(e.target.value)}>
                <option value="all">Todas</option>
                <option value="Urbana">Urbana</option>
                <option value="Rural">Rural</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Comuna</label>
              <select className={selCls} value={filtros.comuna} onChange={(e) => setComuna(e.target.value)}>
                <option value="all">Todas</option>
                {comunas.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Corregimiento</label>
              <select className={selCls} value={filtros.corregimiento} onChange={(e) => setCorregimiento(e.target.value)}>
                <option value="all">Todos</option>
                {corregimientos.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Barrio</label>
              <select className={selCls} value={filtros.barrio} onChange={(e) => setBarrio(e.target.value)}>
                <option value="all">Todos</option>
                {barrios.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Puesto de votación</label>
              <select className={selCls} value={filtros.puesto} onChange={(e) => patch({ puesto: e.target.value })}>
                <option value="all">Todos</option>
                {puestos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Mesa</label>
              <input
                type="number"
                value={filtros.mesa === 'all' ? '' : filtros.mesa}
                onChange={(e) => patch({ mesa: e.target.value === '' ? 'all' : e.target.value })}
                placeholder="Ej: 101"
                className={selCls}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Nivel de voto</label>
              <select className={selCls} value={filtros.nivelVoto} onChange={(e) => patch({ nivelVoto: e.target.value })}>
                <option value="all">Todos</option>
                <option>Firme</option>
                <option>Indeciso</option>
                <option>En Riesgo</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Validez</label>
              <select className={selCls} value={filtros.validez} onChange={(e) => patch({ validez: e.target.value })}>
                <option value="all">Toda</option>
                <option value="valido">✅ Válido (Valledupar)</option>
                <option value="invalido">⚠️ Inválidos (fuera del electorado)</option>
                <option value="fuera_municipio">🟠 Fuera de municipio</option>
                <option value="fuera_departamento">🔴 Fuera de departamento</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">¿Tiene vehículo?</label>
              <select className={selCls} value={filtros.tieneVehiculo} onChange={(e) => patch({ tieneVehiculo: e.target.value })}>
                <option value="all">Todos</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Tipo de vehículo</label>
              <select className={selCls} value={filtros.tipoVehiculo} onChange={(e) => patch({ tipoVehiculo: e.target.value })}>
                <option value="all">Todos</option>
                <option>Moto</option>
                <option>Automóvil</option>
                <option>Camioneta</option>
                <option>Bus</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Rol Día E</label>
              <select className={selCls} value={filtros.rolDiaE} onChange={(e) => patch({ rolDiaE: e.target.value })}>
                <option value="all">Todos</option>
                <option>Votante</option>
                <option>Conductor</option>
                <option>Testigo electoral</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Interés</label>
              <select className={selCls} value={filtros.interes} onChange={(e) => patch({ interes: e.target.value })}>
                <option value="all">Todos</option>
                {INTERESES.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Grupo social</label>
              <select className={selCls} value={filtros.grupoSocial} onChange={(e) => patch({ grupoSocial: e.target.value })}>
                <option value="all">Todos</option>
                {GRUPOS_SOCIALES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Profesión</label>
              <select className={selCls} value={filtros.profesion} onChange={(e) => patch({ profesion: e.target.value })}>
                <option value="all">Todas</option>
                <option value="Sin profesión">Sin profesión</option>
                {PROFESIONES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Nivel académico</label>
              <select className={selCls} value={filtros.nivelAcademico} onChange={(e) => patch({ nivelAcademico: e.target.value })}>
                <option value="all">Todos</option>
                {NIVELES_ACADEMICOS.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Posgrado</label>
              <select className={selCls} value={filtros.posgrado} onChange={(e) => patch({ posgrado: e.target.value })}>
                <option value="all">Todos</option>
                {POSGRADOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabla con agrupación de columnas: Residencia, Puesto de Votación y Día E */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white mb-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm hidden">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr><th rowSpan={2} className="sticky left-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold whitespace-nowrap">Nombre</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Cédula</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Teléfono</th><th colSpan={4} className="border-b border-gray-200 bg-blue-50/60 px-4 py-1.5 text-center text-[11px] text-blue-700">Residencia</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Reporta a</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Planilla</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Rol</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Validez</th><th colSpan={4} className="border-b border-gray-200 bg-emerald-50/60 px-4 py-1.5 text-center text-[11px] text-emerald-700">Puesto de Votación</th><th className="border-b border-gray-200 bg-purple-50/60 px-4 py-1.5 text-center text-[11px] text-purple-700">Día E</th></tr>
              <tr>{['Departamento','Municipio','Comuna/Correg.','Barrio','Dpto-Votación','Munic-Votación','Pto-Votación','Mesa-Votación','¿Ya votó?'].map((h) => <th key={h} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">{paginado.map((p, i) => { const rol = rolLabel(p); const valido = validezDeApi(p) === 'valido'; const cell = (v: string | number | null | undefined) => v === null || v === undefined || v === '' ? <span className="text-gray-300">—</span> : v; return <tr key={p.id} className={`${i % 2 ? 'bg-gray-50/40' : 'bg-white'} hover:bg-gray-100/60`}><td className={`sticky left-0 z-10 px-4 py-3 ${i % 2 ? 'bg-gray-50/40' : 'bg-white'} whitespace-nowrap`}><button type="button" onClick={() => verSimpatizanteDetalle(p.id)} className="font-medium text-blue-700 hover:underline">{p.nombres} {p.apellidos}</button></td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.cedula}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.telefono)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.departamento)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.municipio}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.zona === 'Urbana' ? p.comuna : p.corregimiento)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.barrio)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.trazabilidad?.padrino?.nombre ?? p.trazabilidad?.lider?.nombre ?? <span className="italic text-gray-400">Raíz de la estructura</span>}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.planillaCodigo)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap"><Badge className={rol === 'Candidato' ? 'bg-rose-50 text-rose-700' : rol === 'Padrino' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>{rol}</Badge></td><td className="px-4 py-3 text-gray-600 whitespace-nowrap"><Badge className={valido ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{valido ? 'Válido' : 'Inválido'}</Badge></td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.puesto ? p.departamento : null)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.puesto ? p.municipio : null)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.puesto ? PUESTOS.find((x) => x.id === p.puesto)?.nombre ?? p.puesto : null)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap">{cell(p.mesa)}</td><td className="px-4 py-3 text-gray-600 whitespace-nowrap"><input type="checkbox" checked={p.votoRegistrado} readOnly disabled className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:opacity-40" /></td></tr> })}</tbody>
          </table>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr><th rowSpan={2} className="sticky left-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold whitespace-nowrap">Nombre</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Cédula</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Teléfono</th><th colSpan={4} className="border-b border-gray-200 bg-blue-50/60 px-4 py-1.5 text-center text-[11px] text-blue-700">Residencia</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Reporta a</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Planilla</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Rol</th><th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Validez</th><th colSpan={4} className="border-b border-gray-200 bg-emerald-50/60 px-4 py-1.5 text-center text-[11px] text-emerald-700">Puesto de Votación</th><th className="border-b border-gray-200 bg-purple-50/60 px-4 py-1.5 text-center text-[11px] text-purple-700">Día E</th></tr><tr>{['Departamento','Municipio','Comuna/Correg.','Barrio','Dpto-Votación','Munic-Votación','Pto-Votación','Mesa-Votación','¿Ya votó?'].map((h) => <th key={h} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>)}</tr>
              <tr className="hidden">
                {['Persona', 'Cédula', 'Departamento', 'Municipio', 'Comuna/Correg.', 'Barrio', 'Perfil', 'Líder', 'Nivel', 'Acciones'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-2.5 py-2 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginado.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-2.5 py-10 text-slate-400 text-xs text-center">
                    {cargandoSimpatizantes ? 'Cargando simpatizantes…' : 'Sin resultados para los filtros aplicados.'}
                  </td>
                </tr>
              )}
              {paginado.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 bg-white hover:bg-gray-100/60">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 text-sm whitespace-nowrap">
                    <button onClick={() => verSimpatizanteDetalle(p.id)} className="whitespace-nowrap text-left font-medium text-blue-700 hover:underline">
                      {p.nombres} {p.apellidos}
                    </button>
                  </td>
                  <td className="px-2.5 py-1.5 font-mono text-slate-600 text-xs whitespace-nowrap">{p.cedula}</td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">{p.departamento}</td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">{p.municipio}</td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">{p.zona === 'Urbana' ? p.comuna : p.corregimiento}</td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">{p.barrio}</td>
                  <td className="px-2.5 py-1.5">
                    <div className="text-xs text-slate-700 whitespace-nowrap">{p.profesion || 'Sin profesión'}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge className={nivelAcademicoTone(p.nivelAcademico)}>{p.nivelAcademico}</Badge>
                      {p.posgrado !== 'Ninguno' && <Badge className="bg-purple-100 text-purple-700">{p.posgrado}</Badge>}
                    </div>
                  </td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">{nombreLiderApi(p.liderId)}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <Badge className={nivelTone(p.nivelVoto)}>{p.nivelVoto}</Badge>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => verSimpatizanteDetalle(p.id)}
                        title="Ver ficha completa"
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {puedeGestionar && (
                        <>
                          <button
                            onClick={() => openPersona({ mode: 'edit', personaId: p.id })}
                            title={session?.rol === 'gestor' ? 'Completar o editar ficha' : 'Editar ficha'}
                            className={session?.rol === 'gestor' ? 'rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100' : 'p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600'}
                          >
                            {session?.rol === 'gestor' ? 'Completar' : <Pencil className="w-3.5 h-3.5" />}
                          </button>
                          {puedeEliminar && <button
                            onClick={() => void eliminarFicha(p)}
                            disabled={eliminandoId === p.id}
                            title="Eliminar ficha"
                            className="p-1 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginador */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-xs text-slate-500">
          Mostrando{' '}
          <b>
            {filtered.length === 0 ? 0 : (current - 1) * PER_PAGE + 1}–{Math.min(current * PER_PAGE, filtered.length)}
          </b>{' '}
          de <b>{filtered.length}</b> fichas · {PER_PAGE} por página
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          {paginas(current, totalPages).map((pg, i) =>
            pg === '...' ? (
              <span key={'e' + i} className="px-2 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${
                  pg === current ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pg}
              </button>
            ),
          )}
          <button
            disabled={current === totalPages}
            onClick={() => setPage(current + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            Siguiente <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
