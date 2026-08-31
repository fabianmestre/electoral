import { useMemo, useState } from 'react'
import { Filter, Search, Send, X } from 'lucide-react'
import { useApp } from '../store'
import {
  BARRIOS,
  CATEGORIAS,
  COMUNAS,
  CORREGIMIENTOS,
  DEPARTAMENTOS,
  GRUPOS_SOCIALES,
  INTERESES,
  LIDERES_INFO,
  MUNICIPIOS,
  NIVELES_ACADEMICOS,
  OCUPACIONES,
  POSGRADOS,
  PROFESIONES,
  PUESTOS,
  barriosDeFiltro,
  comunasDeMunicipio,
  corregimientosDeMunicipio,
  destinatariosFiltrados,
  getPersona,
  municipiosDeDepartamento,
  nombreLider,
  puestosDeBarrio,
} from '../data'
import type { Canal, FiltrosEnvio } from '../types'
import { fmtFechaHora } from '../lib'
import { Badge, Card, Modal } from '../components/ui'

const DEFAULT_FILTROS: FiltrosEnvio = {
  liderId: 'all',
  departamento: 'all',
  municipio: 'all',
  zona: 'all',
  comuna: 'all',
  corregimiento: 'all',
  barrio: 'all',
  puesto: 'all',
  tieneVehiculo: false,
  interes: 'all',
  grupoSocial: 'all',
  ocupacion: 'all',
  profesion: 'all',
  nivelAcademico: 'all',
  posgrado: 'all',
  nivelVoto: 'all',
  rolDiaE: 'all',
  validez: 'all',
  categoria: 'all',
  estado: 'all',
  conGestiones: 'all',
}

export default function Comunicaciones() {
  const { db, enviarComunicacion, notify } = useApp()
  const [tab, setTab] = useState<'segmento' | 'individual' | 'historial'>('segmento')
  const [filtros, setFiltros] = useState<FiltrosEnvio>(DEFAULT_FILTROS)
  const [showFiltros, setShowFiltros] = useState(false)
  const [canal, setCanal] = useState<Canal>('WhatsApp API')
  const [mensaje, setMensaje] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const segmento = useMemo(() => destinatariosFiltrados(db, filtros), [db, filtros])
  const personaSel = personaId ? getPersona(db, personaId) : undefined
  const destinatarios = tab === 'segmento' ? segmento : tab === 'individual' ? (personaSel ? [personaSel] : []) : []

  const matches = useMemo(() => {
    if (!busqueda.trim()) return []
    const t = busqueda.trim().toLowerCase()
    return db.personas.filter((p) => `${p.nombres} ${p.apellidos} ${p.cedula}`.toLowerCase().includes(t)).slice(0, 15)
  }, [db, busqueda])

  const patch = (partial: Partial<FiltrosEnvio>) => setFiltros((f) => ({ ...f, ...partial }))

  const patchGeo = (partial: Partial<FiltrosEnvio>, resets: string[]) => {
    const reset: Record<string, string> = {}
    resets.forEach((k) => (reset[k] = 'all'))
    setFiltros((f) => ({ ...f, ...partial, ...reset } as FiltrosEnvio))
  }
  const setDepartamento = (v: string) => patchGeo({ departamento: v }, ['municipio', 'zona', 'comuna', 'corregimiento', 'barrio', 'puesto'])
  const setMunicipio = (v: string) => patchGeo({ municipio: v }, ['zona', 'comuna', 'corregimiento', 'barrio', 'puesto'])
  const setZona = (v: string) => patchGeo({ zona: v }, ['comuna', 'corregimiento', 'barrio', 'puesto'])
  const setComuna = (v: string) => patchGeo({ comuna: v }, ['corregimiento', 'barrio', 'puesto'])
  const setCorregimiento = (v: string) => patchGeo({ corregimiento: v }, ['comuna', 'barrio', 'puesto'])
  const setBarrio = (v: string) => patchGeo({ barrio: v }, ['puesto'])

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

  const chips = useMemo(() => {
    const LABELS: Record<string, string> = {
      liderId: 'Líder', departamento: 'Depto', municipio: 'Municipio', zona: 'Zona',
      comuna: 'Comuna', corregimiento: 'Corregimiento', barrio: 'Barrio', puesto: 'Puesto',
      interes: 'Interés', grupoSocial: 'Grupo social', ocupacion: 'Ocupación', profesion: 'Profesión',
      nivelAcademico: 'Nivel académico', posgrado: 'Posgrado', nivelVoto: 'Nivel de voto', rolDiaE: 'Rol Día E',
      validez: 'Validez', categoria: 'Gestión', estado: 'Estado', tieneVehiculo: 'Vehículo', conGestiones: 'Gestiones',
    }
    const VAL_LABEL: Record<string, string> = { valido: 'Válidos', invalido: 'Inválidos', fuera_municipio: 'Fuera de municipio', fuera_departamento: 'Fuera de departamento' }
    const c: { key: string; label: string; value: string }[] = []
    Object.entries(filtros).forEach(([k, v]) => {
      if (k === 'tieneVehiculo') {
        if (v === true) c.push({ key: k, label: LABELS[k], value: 'Disponible' })
        return
      }
      if (v === 'all' || v === '') return
      const s = String(v)
      let val = s
      if (k === 'liderId') val = nombreLider(s)
      else if (k === 'puesto') val = PUESTOS.find((p) => p.id === s)?.nombre ?? s
      else if (k === 'conGestiones') val = s === 'si' ? 'Con gestiones' : 'Sin gestiones'
      else if (k === 'validez') val = VAL_LABEL[s] ?? s
      c.push({ key: k, label: LABELS[k] ?? k, value: val })
    })
    return c
  }, [filtros])

  const removeChip = (key: string) => {
    setFiltros((f) => {
      if (key === 'tieneVehiculo') return { ...f, [key]: false } as FiltrosEnvio
      return { ...f, [key]: 'all' } as FiltrosEnvio
    })
  }

  const limpiarFiltros = () => setFiltros({ ...DEFAULT_FILTROS })

  const segLabel = chips.length > 0 ? chips.map((c) => `${c.label}: ${c.value}`).join(' · ') : 'Todos los simpatizantes'

  const destinoLabel =
    tab === 'segmento'
      ? segLabel
      : tab === 'individual'
        ? personaSel
          ? `${personaSel.nombres} ${personaSel.apellidos}`
          : 'Selecciona una persona'
        : ''

  const enviar = () => {
    if (!mensaje.trim()) {
      notify('Escribe un mensaje', 'warn')
      return
    }
    if (destinatarios.length === 0) {
      notify(tab === 'segmento' ? 'El segmento no tiene destinatarios' : 'Selecciona una persona', 'warn')
      return
    }
    enviarComunicacion(canal, mensaje.trim(), destinoLabel, destinatarios.length)
    notify(`Campaña enviada a ${destinatarios.length} contacto(s) vía ${canal}`, 'success')
    setMensaje('')
  }

  const selCls = 'w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500'
  const seccion = 'text-[11px] font-bold uppercase tracking-wider text-blue-700 col-span-full mt-1'

  const redactarCard = (
    <Card title="✉️ Redactar y enviar">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Canal</label>
          <select value={canal} onChange={(e) => setCanal(e.target.value as Canal)} className={selCls}>
            <option>WhatsApp API</option>
            <option>SMS</option>
            <option>Email</option>
            <option>Llamada</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Mensaje</label>
          <textarea
            rows={6}
            className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe el mensaje de campaña..."
          />
        </div>
        <button onClick={enviar} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
          <Send className="w-4 h-4" /> Enviar
        </button>
      </div>
    </Card>
  )

  return (
    <div>
      {/* Pestañas */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setTab('segmento')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'segmento' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          🎯 Envío a segmento
        </button>
        <button
          onClick={() => setTab('individual')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'individual' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          👤 Envío individual
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'historial' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          📜 Historial
        </button>
      </div>

      {tab !== 'historial' && (
        <>
          {tab === 'segmento' ? (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="🎯 Segmentación">
                <div className="space-y-3">
                  <button
                    onClick={() => setShowFiltros(true)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border ${
                      chips.length > 0 ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" /> Filtros
                    {chips.length > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 inline-flex items-center justify-center">
                        {chips.length}
                      </span>
                    )}
                  </button>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Destinatarios</span>
                      <b className="text-xl text-blue-700">{segmento.length}</b>
                    </div>
                    <div className="mt-2">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Filtros aplicados</div>
                      {chips.length === 0 ? (
                        <p className="text-xs text-slate-500">Sin filtros — se envía a todos los simpatizantes.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {chips.map((c) => (
                            <button
                              key={c.key}
                              onClick={() => removeChip(c.key)}
                              className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 text-slate-700 rounded-full px-2 py-0.5 hover:bg-slate-100"
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
                    </div>
                  </div>
                </div>
              </Card>
              {redactarCard}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="👤 Destinatario individual">
                {personaSel ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                        {personaSel.nombres[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {personaSel.nombres} {personaSel.apellidos}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          CC {personaSel.cedula} · {personaSel.municipio} · {personaSel.barrio}
                        </div>
                      </div>
                      <button onClick={() => { setPersonaId(''); setBusqueda('') }} className="text-xs text-slate-500 hover:text-slate-700 underline shrink-0">
                        Cambiar
                      </button>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                      <div>📱 {personaSel.telefono}</div>
                      <div>✉️ {personaSel.correo || '—'}</div>
                      <div>📍 {personaSel.zona === 'Urbana' ? personaSel.comuna : personaSel.corregimiento} · {personaSel.barrio}</div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Buscar persona</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Escribe nombre o cédula..."
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                      {busqueda.trim() && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {matches.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => { setPersonaId(p.id); setBusqueda('') }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100"
                            >
                              {p.nombres} {p.apellidos}{' '}
                              <span className="text-slate-400">· CC {p.cedula} · {p.municipio}</span>
                            </button>
                          ))}
                          {matches.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Sin coincidencias.</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
              {redactarCard}
            </div>
          )}

          {/* Modal de filtros */}
          <Modal
            open={showFiltros}
            onClose={() => setShowFiltros(false)}
            title="🎯 Filtros de segmentación"
            subtitle="Define el segmento de destinatarios"
            wide
            footer={
              <>
                <button onClick={limpiarFiltros} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
                  Limpiar filtros
                </button>
                <button onClick={() => setShowFiltros(false)} className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
                  Aplicar ({segmento.length})
                </button>
              </>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              <div className={seccion}>📍 Ubicación</div>
              <div>
                <label className="text-xs font-medium text-slate-600">Líder</label>
                <select className={selCls} value={filtros.liderId} onChange={(e) => patch({ liderId: e.target.value })}>
                  <option value="all">Todos</option>
                  {LIDERES_INFO.map((l) => (
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

              <div className={seccion}>👤 Perfil</div>
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
              <div>
                <label className="text-xs font-medium text-slate-600">Ocupación</label>
                <select className={selCls} value={filtros.ocupacion} onChange={(e) => patch({ ocupacion: e.target.value })}>
                  <option value="all">Todas</option>
                  {OCUPACIONES.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
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
                <label className="text-xs font-medium text-slate-600">Rol Día E</label>
                <select className={selCls} value={filtros.rolDiaE} onChange={(e) => patch({ rolDiaE: e.target.value })}>
                  <option value="all">Todos</option>
                  <option>Votante</option>
                  <option>Conductor</option>
                  <option>Testigo electoral</option>
                </select>
              </div>

              <div className={seccion}>🤝 Gestión</div>
              <div>
                <label className="text-xs font-medium text-slate-600">Categoría de gestión</label>
                <select className={selCls} value={filtros.categoria} onChange={(e) => patch({ categoria: e.target.value })}>
                  <option value="all">Cualquier categoría</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Estado de gestión</label>
                <select className={selCls} value={filtros.estado} onChange={(e) => patch({ estado: e.target.value })}>
                  <option value="all">Cualquier estado</option>
                  {['Pendiente', 'En Proceso', 'Resuelto', 'Cancelado'].map((e) => (
                    <option key={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className={seccion}>✅ Opciones</div>
              <div>
                <label className="text-xs font-medium text-slate-600">Validez</label>
                <select className={selCls} value={filtros.validez} onChange={(e) => patch({ validez: e.target.value })}>
                  <option value="all">Toda</option>
                  <option value="valido">✅ Válidos (Valledupar)</option>
                  <option value="invalido">⚠️ Inválidos (fuera)</option>
                  <option value="fuera_municipio">🟠 Fuera de municipio</option>
                  <option value="fuera_departamento">🔴 Fuera de departamento</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">¿Tiene gestiones?</label>
                <select className={selCls} value={filtros.conGestiones} onChange={(e) => patch({ conGestiones: e.target.value })}>
                  <option value="all">Todos</option>
                  <option value="si">Con gestiones</option>
                  <option value="no">Sin gestiones</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 col-span-2">
                <input type="checkbox" checked={filtros.tieneVehiculo} onChange={(e) => patch({ tieneVehiculo: e.target.checked })} className="accent-blue-600" />
                Tiene vehículo a disposición
              </label>
            </div>
          </Modal>
        </>
      )}

      {tab === 'historial' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-800">📜 Historial de envíos</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {['Fecha', 'Canal', 'Segmento', 'Mensaje', 'Destinatarios', 'Usuario'].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {db.comunicaciones.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-slate-400 text-sm text-center">
                      Sin envíos.
                    </td>
                  </tr>
                )}
                {[...db.comunicaciones].reverse().map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-3 py-2.5 text-sm whitespace-nowrap">{fmtFechaHora(c.fecha)}</td>
                    <td className="px-3 py-2.5">
                      <Badge className="bg-blue-100 text-blue-700">{c.canal}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 max-w-xs">{c.segmento}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600 max-w-sm">{c.mensaje}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold">{c.destinatarios}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-600">{c.usuario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
