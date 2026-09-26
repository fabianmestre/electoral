import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { confirmar } from '../../../components/ConfirmDialog'
import { ChevronLeft, ChevronRight, Filter, Plus, Search, X } from 'lucide-react'
import { useApp } from '../../../store'
import {
  DEPARTAMENTO_CAMPANA,
  GRUPOS_SOCIALES,
  INTERESES,
  MUNICIPIO_CAMPANA,
  NIVELES_ACADEMICOS,
  PROFESIONES,
  PUESTOS,
} from '../../../data'
import { useCatalogos } from '../../../catalogos'
import { ROL_SIMPATIZANTE_LABEL } from '../../../types'
import type { RolSimpatizante, SimpatizanteApi, Validez } from '../../../types'

const ROL_PLURAL: Record<RolSimpatizante, string> = {
  simpatizante: 'simpatizantes', lider: 'líderes', padrino: 'padrinos', gestor: 'gestores', digitador: 'digitadores',
}

const ROL_TONE: Record<RolSimpatizante, string> = {
  simpatizante: 'bg-blue-50 text-blue-700',
  lider: 'bg-emerald-50 text-emerald-700',
  padrino: 'bg-purple-50 text-purple-700',
  gestor: 'bg-amber-50 text-amber-700',
  digitador: 'bg-slate-100 text-slate-700',
}
import { Badge } from '../../../components/ui'

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
  dptoVotacion: string
  municVotacion: string
  padrinoId: string
  rol: string
  estado: string
  gestiones: string
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
  dptoVotacion: 'all',
  municVotacion: 'all',
  padrinoId: 'all',
  rol: 'all',
  estado: 'all',
  gestiones: 'all',
}

// Los puestos cargados pueden venir como 'pv-06'; el catálogo usa 'PV06'.
const normPuesto = (v: string | null | undefined) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
// Tipos de vehículo agrupados como en el filtro (la planilla usa Carro/Moto; la ficha, Moto/Automóvil/Camioneta/Bus).
const TIPO_VEHICULO: Record<string, string> = { Moto: 'Moto', Automóvil: 'Carro', Camioneta: 'Carro', Carro: 'Carro', Bus: 'Bus/Buseta' }
const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))

const selCls = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500'

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

// rolMode: vista de un rol (Líderes, Gestores…). Sin búsqueda muestra solo ese rol; al buscar
// muestra a cualquier simpatizante para poder promoverlo.
// soloPropios: «Mis Registros» del líder — solo las fichas que la sesión registró, en lectura.
// accionExtra: acción adicional por fila en las vistas de rol (p. ej. asignar líderes a un gestor).
export default function Directorio({ leaderMode = false, rolMode = leaderMode ? 'lider' : undefined, soloPropios = false, accionExtra }: { leaderMode?: boolean; rolMode?: RolSimpatizante; soloPropios?: boolean; accionExtra?: (p: SimpatizanteApi) => ReactNode }) {
  const {
    cambiarRolSimpatizante, padrinosApi, cargarPadrinosApi, cargarLideresApi, notify, gestionesApi, cargarGestionesApi, usuariosApi,
    session, openPersona, liderFilter, setLiderFilter, directorioPreset, clearDirectorioPreset,
    borrarTodosSimpatizantes, simpatizantesApi, lideresApi, cargandoSimpatizantes, cargarSimpatizantesApi,
  } = useApp()
  const [filtros, setFiltros] = useState<Filtros>({ ...DEFAULT_F, liderId: leaderMode ? 'all' : liderFilter })
  const [showFiltros, setShowFiltros] = useState(false)
  const [page, setPage] = useState(1)
  const [borrando, setBorrando] = useState(false)
  const [cambiandoId, setCambiandoId] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (rolMode === 'padrino' && session?.rol === 'admin') void cargarPadrinosApi() }, [rolMode])
  // Quién depende de esta persona en la estructura (se muestra al pasar el cursor por "Quitar rol").
  const aCargo = (p: SimpatizanteApi) => {
    if (p.rol === 'padrino') {
      const cuenta = padrinosApi.find((x) => x.cedula === p.cedula)
      const n = cuenta ? lideresApi.filter((l) => l.activo && l.padrinoId === cuenta.id).length : 0
      return `Tiene ${n} líder(es) a cargo`
    }
    if (p.rol === 'lider') {
      const registro = lideresApi.find((l) => l.cedula === p.cedula)
      const n = registro ? simpatizantesApi.filter((s) => s.liderId === registro.id && s.id !== p.id).length : 0
      return `Tiene ${n} simpatizante(s) a cargo`
    }
    return undefined
  }
  const cambiarRol = async (p: SimpatizanteApi, rol: RolSimpatizante) => {
    const accion = rol === 'simpatizante' ? `quitarle el rol ${ROL_SIMPATIZANTE_LABEL[p.rol]} a` : `promover a ${ROL_SIMPATIZANTE_LABEL[rol]} a`
    if (!(await confirmar({ titulo: rol === 'simpatizante' ? 'Quitar rol' : `Promover a ${ROL_SIMPATIZANTE_LABEL[rol]}`, mensaje: `¿Seguro que quieres ${accion} ${p.nombres} ${p.apellidos}?`, confirmar: rol === 'simpatizante' ? 'Quitar rol' : 'Promover', tono: rol === 'simpatizante' ? 'peligro' : 'normal' }))) return
    setCambiandoId(p.id)
    try {
      if (await cambiarRolSimpatizante(p.id, rol)) {
        notify(rol === 'simpatizante' ? 'Rol retirado' : `Ahora es ${ROL_SIMPATIZANTE_LABEL[rol]}`, 'success')
        await Promise.all([cargarSimpatizantesApi(), cargarLideresApi(), rolMode === 'padrino' ? cargarPadrinosApi() : undefined])
      }
    } finally {
      setCambiandoId(null)
    }
  }
  const validezLabel = (p: SimpatizanteApi) => validezDeApi(p) === 'valido' ? 'Válido' : 'Inválido'

  const nombreLiderApi = (id: string) => {
    const l = lideresApi.find((x) => x.id === id)
    return l ? `${l.nombres} ${l.apellidos}` : '—'
  }

  useEffect(() => {
    void cargarSimpatizantesApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const borrarTodos = async () => {
    if (!(await confirmar({ titulo: 'Borrar todos los simpatizantes', mensaje: 'Se borrarán TODOS los simpatizantes guardados en la base de datos. Esta acción no se puede deshacer.', confirmar: 'Borrar todo', tono: 'peligro' }))) return
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
      for (const k of ['municipio', 'comuna', 'corregimiento', 'barrio', 'interes', 'grupoSocial', 'nivelAcademico'] as const) {
        if (directorioPreset[k]) partial[k] = directorioPreset[k]
      }
      patch(partial)
      clearDirectorioPreset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directorioPreset])

  const cat = useCatalogos()
  const puestoCat = (p: SimpatizanteApi) => cat.puestos.find((x) => x.codigo === normPuesto(p.puesto))
  const dptoVotacionDe = (p: SimpatizanteApi) => p.departamentoVotacion ?? puestoCat(p)?.departamento ?? null
  const municVotacionDe = (p: SimpatizanteApi) => p.municipioVotacion ?? puestoCat(p)?.municipio ?? null
  // Padrino: el de la trazabilidad o, si no hay, el del líder asignado.
  const padrinoDe = (p: SimpatizanteApi) => p.trazabilidad?.padrino?.id ?? lideresApi.find((l) => l.id === p.liderId)?.padrinoId ?? null
  const conGestiones = useMemo(() => new Set(gestionesApi.map((g) => g.simpatizanteId).filter(Boolean)), [gestionesApi])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (session?.rol === 'admin' || session?.rol === 'padrino') void cargarGestionesApi() }, [])

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
    if (f.puesto !== 'all') l = l.filter((p) => normPuesto(p.puesto) === normPuesto(f.puesto))
    if (f.dptoVotacion !== 'all') l = l.filter((p) => dptoVotacionDe(p) === f.dptoVotacion)
    if (f.municVotacion !== 'all') l = l.filter((p) => municVotacionDe(p) === f.municVotacion)
    if (f.padrinoId !== 'all') l = l.filter((p) => padrinoDe(p) === f.padrinoId)
    if (f.rol !== 'all') l = l.filter((p) => (p.rol ?? 'simpatizante') === f.rol)
    if (f.estado !== 'all') l = l.filter((p) => (p.estado ?? 'Activo') === f.estado)
    if (f.gestiones !== 'all') l = l.filter((p) => conGestiones.has(p.id) === (f.gestiones === 'si'))
    if (f.mesa !== 'all' && f.mesa !== '') l = l.filter((p) => p.mesa === Number(f.mesa))
    if (f.nivelVoto !== 'all') l = l.filter((p) => p.nivelVoto === f.nivelVoto)
    if (f.validez === 'valido') l = l.filter((p) => esValidoApi(p))
    if (f.validez === 'invalido') l = l.filter((p) => !esValidoApi(p))
    if (f.validez === 'fuera_municipio') l = l.filter((p) => validezDeApi(p) === 'fuera_municipio')
    if (f.validez === 'fuera_departamento') l = l.filter((p) => validezDeApi(p) === 'fuera_departamento')
    if (f.tieneVehiculo !== 'all') l = l.filter((p) => (p.vehiculos.length > 0 || !!p.tieneVehiculo) === (f.tieneVehiculo === 'si'))
    if (f.tipoVehiculo !== 'all') l = l.filter((p) => [...p.vehiculos.map((v) => v.tipo), p.tipoVehiculoPlanilla].some((t) => t && TIPO_VEHICULO[t] === f.tipoVehiculo))
    if (f.rolDiaE !== 'all') l = l.filter((p) => p.rolDiaE === f.rolDiaE)
    if (f.interes !== 'all') l = l.filter((p) => p.intereses.includes(f.interes))
    if (f.grupoSocial !== 'all') l = l.filter((p) => p.gruposSociales.includes(f.grupoSocial))
    if (f.profesion !== 'all') l = l.filter((p) => (f.profesion === 'Sin profesión' ? !p.profesion || p.profesion === 'Sin estudios' : p.profesion === f.profesion))
    if (f.nivelAcademico !== 'all') l = l.filter((p) => p.nivelAcademico === f.nivelAcademico)
    if (f.posgrado !== 'all') l = l.filter((p) => p.posgrado === f.posgrado)
    if (rolMode && !f.q.trim()) l = l.filter((p) => (p.rol ?? 'simpatizante') === rolMode)
    if (soloPropios) l = l.filter((p) => p.creadoPor === session?.id)
    if (f.q.trim()) {
      const q = f.q.trim().toLowerCase()
      l = l.filter((p) =>
        `${p.nombres} ${p.apellidos} ${p.cedula} ${p.barrio} ${p.municipio} ${p.comuna ?? ''} ${p.corregimiento ?? ''} ${p.telefono} ${p.correo ?? ''}`
          .toLowerCase()
          .includes(q),
      )
    }
    return l.sort((a, b) => a.nombres.localeCompare(b.nombres))
  }, [simpatizantesApi, filtros, rolMode, soloPropios, session?.id, conGestiones, cat.puestos, lideresApi])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const current = Math.min(page, totalPages)
  const paginado = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE)

  const activos =
    Object.entries(filtros).filter(([k, v]) => k !== 'q' && v !== 'all' && v !== '').length + (filtros.q.trim() ? 1 : 0)

  const base = simpatizantesApi
  const enMunicipio = base.filter((p) => (filtros.departamento === 'all' || p.departamento === filtros.departamento) && (filtros.municipio === 'all' || p.municipio === filtros.municipio))
  const opt = {
    departamentos: uniq(base.map((p) => p.departamento)),
    municipios: uniq(base.filter((p) => filtros.departamento === 'all' || p.departamento === filtros.departamento).map((p) => p.municipio)),
    comunas: uniq(enMunicipio.filter((p) => filtros.zona !== 'Rural').map((p) => p.comuna)),
    corregimientos: uniq(enMunicipio.filter((p) => filtros.zona !== 'Urbana').map((p) => p.corregimiento)),
    barrios: uniq(enMunicipio.filter((p) => (filtros.comuna === 'all' || p.comuna === filtros.comuna) && (filtros.corregimiento === 'all' || p.corregimiento === filtros.corregimiento)).map((p) => p.barrio)),
    dptosVotacion: uniq([...base.map(dptoVotacionDe), ...cat.puestos.map((x) => x.departamento)]),
    municsVotacion: uniq([...base.filter((p) => filtros.dptoVotacion === 'all' || dptoVotacionDe(p) === filtros.dptoVotacion).map(municVotacionDe), ...cat.puestos.filter((x) => filtros.dptoVotacion === 'all' || x.departamento === filtros.dptoVotacion).map((x) => x.municipio)]),
    puestos: cat.puestos.filter((x) => (filtros.dptoVotacion === 'all' || x.departamento === filtros.dptoVotacion) && (filtros.municVotacion === 'all' || x.municipio === filtros.municVotacion)),
    padrinos: [...new globalThis.Map([
      ...usuariosApi.filter((u) => u.rol === 'padrino').map((u) => [u.id, u.nombre] as [string, string]),
      ...base.filter((p) => p.trazabilidad?.padrino?.id).map((p) => [p.trazabilidad!.padrino.id, p.trazabilidad!.padrino.nombre] as [string, string]),
    ])].sort((a, b) => a[1].localeCompare(b[1])),
    lideres: lideresApi.filter((l) => filtros.padrinoId === 'all' || l.padrinoId === filtros.padrinoId).sort((a, b) => a.nombres.localeCompare(b.nombres)),
  }

  const activeChips = useMemo(() => {
    const LABELS: Record<string, string> = {
      liderId: 'Líder', departamento: 'Depto', municipio: 'Municipio', zona: 'Zona',
      comuna: 'Comuna', corregimiento: 'Corregimiento', barrio: 'Barrio', puesto: 'Puesto', mesa: 'Mesa',
      nivelVoto: 'Nivel de voto', validez: 'Validez', tieneVehiculo: 'Vehículo', tipoVehiculo: 'Tipo vehículo',
      rolDiaE: 'Rol Día E', interes: 'Interés', grupoSocial: 'Grupo social', profesion: 'Profesión',
      nivelAcademico: 'Nivel académico', posgrado: 'Posgrado', dptoVotacion: 'Depto votación', municVotacion: 'Munic. votación',
      padrinoId: 'Padrino', rol: 'Rol', estado: 'Estado', gestiones: 'Gestiones',
    }
    const VAL_LABEL: Record<string, string> = { valido: 'Válido', invalido: 'Inválidos', fuera_municipio: 'Fuera de municipio', fuera_departamento: 'Fuera de departamento' }
    const chips: { key: keyof Filtros; label: string; value: string }[] = []
    Object.entries(filtros).forEach(([k, v]) => {
      if (k === 'q' || v === 'all' || v === '') return
      let val = v
      if (k === 'liderId') val = nombreLiderApi(v)
      else if (k === 'puesto') val = cat.puestos.find((p) => p.codigo === normPuesto(v))?.nombre ?? v
      else if (k === 'padrinoId') val = opt.padrinos.find(([id]) => id === v)?.[1] ?? v
      else if (k === 'rol') val = ROL_SIMPATIZANTE_LABEL[v as RolSimpatizante] ?? v
      else if (k === 'tieneVehiculo' || k === 'gestiones') val = v === 'si' ? 'Sí' : 'No'
      else if (k === 'validez') val = VAL_LABEL[v] ?? v
      chips.push({ key: k as keyof Filtros, label: LABELS[k] ?? k, value: val })
    })
    return chips
  }, [filtros, lideresApi, cat.puestos, opt.padrinos])

  return (
    <div>
      {rolMode && <p className="mb-3 text-xs text-gray-400">Por defecto ves a los {ROL_PLURAL[rolMode]}. Busca por nombre o cédula para encontrar cualquier simpatizante y promoverlo.</p>}
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
        {!rolMode && session?.rol !== 'gestor' && <button onClick={() => openPersona({ mode: 'new' })} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nuevo Simpatizante
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

      {/* Panel de filtros: Residencia, Puesto de Votación y Estructura y Caracterización */}
      {showFiltros && (() => {
        const sel = (label: string, k: keyof Filtros, opciones: [string, string][], todos = 'Todos', onChange?: (v: string) => void) => (
          <div>
            <label htmlFor={`f-${k}`} className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
            <select id={`f-${k}`} className={selCls} value={filtros[k]} onChange={(e) => (onChange ?? ((v: string) => patch({ [k]: v } as Partial<Filtros>)))(e.target.value)}>
              <option value="all">{todos}</option>
              {opciones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )
        const same = (xs: readonly string[]) => xs.map((x) => [x, x] as [string, string])
        const grupo = (titulo: string, tono: string, hijos: ReactNode) => (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <p className={`border-b px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${tono}`}>{titulo}</p>
            <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">{hijos}</div>
          </div>
        )
        return (
          <div className="mb-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 fade-in">
            <p className="text-xs text-gray-400">Los filtros de <span className="font-medium text-blue-600">Residencia</span> usan la ubicación donde vive el simpatizante; los de <span className="font-medium text-emerald-600">Puesto de Votación</span> usan dónde está inscrito para votar — pueden no coincidir.</p>
            {grupo('Residencia', 'bg-blue-50 text-blue-700 border-blue-100', <>
              {sel('Departamento (residencia)', 'departamento', same(opt.departamentos), 'Todos', setDepartamento)}
              {sel('Municipio (residencia)', 'municipio', same(opt.municipios), 'Todos', setMunicipio)}
              {sel('Zona', 'zona', same(['Urbana', 'Rural']), 'Todas', setZona)}
              {sel('Comuna', 'comuna', same(opt.comunas), 'Todas', setComuna)}
              {sel('Corregimiento', 'corregimiento', same(opt.corregimientos), 'Todos', setCorregimiento)}
              {sel('Barrio', 'barrio', same(opt.barrios), 'Todos', setBarrio)}
            </>)}
            {grupo('Puesto de Votación', 'bg-emerald-50 text-emerald-700 border-emerald-100', <>
              {sel('Departamento (votación)', 'dptoVotacion', same(opt.dptosVotacion), 'Todos', (v) => patch({ dptoVotacion: v, municVotacion: 'all', puesto: 'all' }))}
              {sel('Municipio (votación)', 'municVotacion', same(opt.municsVotacion), 'Todos', (v) => patch({ municVotacion: v, puesto: 'all' }))}
              {sel('Puesto de votación', 'puesto', opt.puestos.map((x) => [x.codigo, `${x.nombre} (${x.municipio})`] as [string, string]))}
              <div>
                <label htmlFor="f-mesa" className="mb-1 block text-xs font-medium text-gray-500">Mesa</label>
                <input id="f-mesa" inputMode="numeric" placeholder="Ej: 101" className={selCls} value={filtros.mesa === 'all' ? '' : filtros.mesa} onChange={(e) => patch({ mesa: e.target.value.replace(/\D/g, '') || 'all' })} />
              </div>
            </>)}
            {grupo('Estructura y Caracterización', 'bg-amber-50 text-amber-700 border-amber-100', <>
              {sel('Padrino', 'padrinoId', opt.padrinos, 'Todos', (v) => patch({ padrinoId: v, liderId: 'all' }))}
              {sel('Líder', 'liderId', opt.lideres.map((l) => [l.id, `${l.nombres} ${l.apellidos}`] as [string, string]), 'Todos', setLider)}
              {sel('Rol', 'rol', (Object.keys(ROL_SIMPATIZANTE_LABEL) as RolSimpatizante[]).map((r) => [r, ROL_SIMPATIZANTE_LABEL[r]] as [string, string]))}
              {sel('Validez', 'validez', [['valido', 'Válido'], ['invalido', 'Inválido']], 'Toda')}
              {sel('Estado en campaña', 'estado', same(['Activo', 'Inactivo', 'Retirado', 'Fallecido']))}
              {sel('Nivel de voto', 'nivelVoto', same(['Firme', 'Indeciso']))}
              {sel('¿Vehículo disponible para campaña?', 'tieneVehiculo', [['si', 'Sí'], ['no', 'No']])}
              {sel('Tipo de vehículo', 'tipoVehiculo', same(['Moto', 'Carro', 'Bus/Buseta']))}
              {sel('Rol Día E', 'rolDiaE', same(['Votante', 'Conductor', 'Testigo electoral']))}
              {sel('¿Tiene gestiones?', 'gestiones', [['si', 'Sí'], ['no', 'No']])}
              {sel('Interés', 'interes', same(INTERESES))}
              {sel('Grupo social', 'grupoSocial', same(GRUPOS_SOCIALES))}
              {sel('Profesión', 'profesion', same(['Sin profesión', ...PROFESIONES.filter((x) => x !== 'Sin estudios')]), 'Todas')}
              {sel('Nivel académico', 'nivelAcademico', same(NIVELES_ACADEMICOS))}
              {sel('Posgrado', 'posgrado', same(['Especialización', 'Maestría', 'Doctorado']))}
            </>)}
            <div className="flex justify-end border-t border-gray-100 pt-3">
              <button type="button" onClick={limpiar} className="text-xs font-medium text-blue-600 hover:underline">Limpiar filtros</button>
            </div>
          </div>
        )
      })()}

      {/* Tabla con agrupación de columnas: Residencia, Puesto de Votación y Día E */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th rowSpan={2} className="sticky left-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 font-semibold whitespace-nowrap">Nombre</th>
                <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Cédula</th>
                <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Teléfono</th>
                <th colSpan={4} className="border-b border-gray-200 bg-blue-50/60 px-4 py-1.5 text-center text-[11px] text-blue-700">Residencia</th>
                <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Reporta a</th>
                <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Planilla</th>
                <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Rol</th>
                <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">Validez</th>
                <th colSpan={4} className="border-b border-gray-200 bg-emerald-50/60 px-4 py-1.5 text-center text-[11px] text-emerald-700">Puesto de Votación</th>
                <th className="border-b border-gray-200 bg-purple-50/60 px-4 py-1.5 text-center text-[11px] text-purple-700">Día E</th>
                {rolMode && <th rowSpan={2} className="border-b border-gray-200 px-4 py-2.5" />}
              </tr>
              <tr>
                {['Departamento', 'Municipio', 'Comuna/Correg.', 'Barrio', 'Dpto-Votación', 'Munic-Votación', 'Pto-Votación', 'Mesa-Votación', '¿Ya votó?'].map((h) => (
                  <th key={h} className="border-b border-gray-200 px-4 py-2.5 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginado.length === 0 && (
                <tr>
                  <td colSpan={rolMode ? 17 : 16} className="px-4 py-10 text-center text-xs text-slate-400">
                    {cargandoSimpatizantes ? 'Cargando simpatizantes…' : rolMode && !filtros.q.trim() ? `Aún no hay nadie con rol ${ROL_SIMPATIZANTE_LABEL[rolMode]}. Busca un simpatizante por nombre o cédula para promoverlo.` : soloPropios ? 'No hay simpatizantes que coincidan con los filtros.' : 'Sin resultados para los filtros aplicados.'}
                  </td>
                </tr>
              )}
              {paginado.map((p, i) => {
                const valido = validezDeApi(p) === 'valido'
                const bg = i % 2 ? 'bg-gray-50' : 'bg-white'
                const td = 'px-4 py-3 text-gray-600 whitespace-nowrap'
                const cell = (v: string | number | null | undefined) =>
                  v === null || v === undefined || v === '' ? <span className="text-gray-300">—</span> : v
                return (
                  <tr key={p.id} className={`${bg} hover:bg-gray-100/60`}>
                    <td className={`sticky left-0 z-10 px-4 py-3 whitespace-nowrap ${bg}`}>
                      <button type="button" disabled={soloPropios} onClick={() => openPersona({ mode: 'edit', personaId: p.id })} className="text-left font-medium text-blue-700 hover:underline disabled:cursor-default disabled:text-gray-700 disabled:no-underline">
                        {p.nombres} {p.apellidos}
                      </button>
                    </td>
                    <td className={td}>{p.cedula}</td>
                    <td className={td}>{cell(p.telefono)}</td>
                    <td className={td}>{cell(p.departamento)}</td>
                    <td className={td}>{cell(p.municipio)}</td>
                    <td className={td}>{cell(p.zona === 'Urbana' ? p.comuna : p.corregimiento)}</td>
                    <td className={td}>{cell(p.barrio)}</td>
                    <td className={td}>
                      {p.trazabilidad?.padrino?.nombre ?? p.trazabilidad?.lider?.nombre ?? <span className="italic text-gray-400">Raíz de la estructura</span>}
                    </td>
                    <td className={td}>{cell(p.planillaCodigo)}</td>
                    <td className={td}>
                      <Badge className={ROL_TONE[p.rol ?? 'simpatizante']}>{ROL_SIMPATIZANTE_LABEL[p.rol ?? 'simpatizante']}</Badge>
                    </td>
                    <td className={td}>
                      <Badge className={valido ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{valido ? 'Válido' : 'Inválido'}</Badge>
                    </td>
                    <td className={td}>{cell(p.departamentoVotacion)}</td>
                    <td className={td}>{cell(p.municipioVotacion)}</td>
                    <td className={td}>{cell(p.puesto ? PUESTOS.find((x) => x.id === p.puesto)?.nombre ?? p.puesto : null)}</td>
                    <td className={td}>{cell(p.mesa)}</td>
                    <td className={td}>
                      <input type="checkbox" checked={p.votoRegistrado} readOnly disabled className="h-4 w-4 rounded border-gray-300 text-blue-600 disabled:opacity-40" />
                    </td>
                    {rolMode && (
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {accionExtra?.(p)}
                        {session?.rol === 'admin' && (p.rol === rolMode
                          ? <button type="button" disabled={cambiandoId === p.id} onClick={() => void cambiarRol(p, 'simpatizante')} title={aCargo(p)} className="whitespace-nowrap text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Quitar rol</button>
                          : <button type="button" disabled={cambiandoId === p.id} onClick={() => void cambiarRol(p, rolMode)} className="whitespace-nowrap text-xs font-medium text-blue-600 hover:underline disabled:opacity-50">Promover a {ROL_SIMPATIZANTE_LABEL[rolMode]}</button>)}
                      </td>
                    )}
                  </tr>
                )
              })}
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
