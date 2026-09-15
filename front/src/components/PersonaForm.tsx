import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../store'
import {
  DEPARTAMENTO_CAMPANA,
  DEPARTAMENTOS,
  GRUPOS_SOCIALES,
  INTERESES,
  MUNICIPIO_CAMPANA,
  NIVELES_ACADEMICOS,
  OCUPACIONES,
  POSGRADOS,
  PROFESIONES,
  PUESTOS,
  buscarPuesto,
} from '../data'
import type { NivelAcademico, NivelVoto, PersonaInput, Posgrado, RolDiaE, SimpatizanteApi, TipoVehiculo, Vehiculo, ZonaGeografica } from '../types'
import { Field, Modal, inputCls } from './ui'

interface FormState {
  nombres: string
  apellidos: string
  cedula: string
  fechaNacimiento: string
  telefono: string
  correo: string
  direccion: string
  departamento: string
  municipio: string
  zona: ZonaGeografica
  comuna: string
  corregimiento: string
  barrio: string
  puesto: string
  mesa: string
  intereses: string[]
  gruposSociales: string[]
  ocupacion: string
  profesion: string
  nivelAcademico: NivelAcademico
  posgrado: Posgrado
  observacion: string
  vehiculos: Vehiculo[]
  liderId: string
  nivelVoto: NivelVoto
  rolDiaE: RolDiaE
  habeasData: boolean
  planillaCodigo: string
}

const emptyForm = (liderId: string): FormState => ({
  nombres: '',
  apellidos: '',
  cedula: '',
  fechaNacimiento: '',
  telefono: '',
  correo: '',
  direccion: '',
  departamento: DEPARTAMENTO_CAMPANA,
  municipio: MUNICIPIO_CAMPANA,
  zona: 'Urbana',
  comuna: '',
  corregimiento: '',
  barrio: '',
  puesto: '',
  mesa: '',
  intereses: [],
  gruposSociales: [],
  ocupacion: OCUPACIONES[0],
  profesion: 'Sin profesión',
  nivelAcademico: 'Bachiller',
  posgrado: 'Ninguno',
  observacion: '',
  vehiculos: [],
  liderId,
  nivelVoto: 'Firme',
  rolDiaE: 'Votante',
  habeasData: false,
  planillaCodigo: '',
})

function simpatizanteToForm(p: SimpatizanteApi): FormState {
  return {
    nombres: p.nombres,
    apellidos: p.apellidos,
    cedula: p.cedula,
    fechaNacimiento: p.fechaNacimiento ?? '',
    telefono: p.telefono,
    correo: p.correo ?? '',
    direccion: p.direccion ?? '',
    departamento: p.departamento ?? '',
    municipio: p.municipio,
    zona: p.zona ?? 'Urbana',
    comuna: p.comuna ?? '',
    corregimiento: p.corregimiento ?? '',
    barrio: p.barrio,
    puesto: p.puesto ?? '',
    mesa: p.mesa ? String(p.mesa) : '',
    intereses: [...p.intereses],
    gruposSociales: [...p.gruposSociales],
    ocupacion: p.ocupacion ?? '',
    profesion: p.profesion ?? '',
    nivelAcademico: p.nivelAcademico,
    posgrado: p.posgrado,
    observacion: p.observacion ?? '',
    vehiculos: p.vehiculos.map((v) => ({ ...v })),
    liderId: p.liderId,
    nivelVoto: p.nivelVoto,
    rolDiaE: p.rolDiaE,
    habeasData: p.habeasData,
    planillaCodigo: p.planillaCodigo ?? '',
  }
}

const municipiosDe = (dep: string) => [...new Set(PUESTOS.filter((p) => p.departamento === dep).map((p) => p.municipio))]
const comunasDe = (mun: string) =>
  [...new Set(PUESTOS.filter((p) => p.municipio === mun && p.zona === 'Urbana').map((p) => p.comuna).filter((x): x is string => !!x))]
const corregimientosDe = (mun: string) =>
  [...new Set(PUESTOS.filter((p) => p.municipio === mun && p.zona === 'Rural').map((p) => p.corregimiento).filter((x): x is string => !!x))]
const barriosDe = (mun: string, zona: ZonaGeografica, comuna: string, corregimiento: string) =>
  [...new Set(PUESTOS.filter((p) => p.municipio === mun && (zona === 'Urbana' ? p.comuna === comuna : p.corregimiento === corregimiento)).map((p) => p.barrio))]
const puestosDe = (mun: string, barrio: string) => PUESTOS.filter((p) => p.municipio === mun && p.barrio === barrio)

export default function PersonaForm() {
  const { personaModal, closePersona, session, db, savePersona, notify, lideresApi, cargarSimpatizanteDetalle } = useApp()
  const [form, setForm] = useState<FormState>(() => emptyForm(''))
  const [hint, setHint] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)
  const [cargando, setCargando] = useState(false)
  const lideresDisponibles = session?.rol === 'admin' || session?.rol === 'digitador' || session?.rol === 'gestor' ? lideresApi.filter((l) => l.activo) : session?.rol === 'lider' ? lideresApi.filter((l) => l.userId === session.id) : lideresApi.filter((l) => l.padrinoId === session?.id)

  useEffect(() => {
    if (!personaModal) return
    setHint(null)
    if (personaModal.mode === 'edit' && personaModal.personaId) {
      setCargando(true)
      void cargarSimpatizanteDetalle(personaModal.personaId).then((p) => {
        if (p) setForm(simpatizanteToForm(p))
        setCargando(false)
      })
    } else {
      setForm(emptyForm(lideresDisponibles[0]?.id ?? ''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaModal])

  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }))

  const onCedula = (ced: string) => {
    patch({ cedula: ced })
    if (ced.length >= 4) {
      const c = db.censo.find((x) => x.cedula === ced)
      if (c) {
        setForm((f) => ({
          ...f,
          cedula: ced,
          departamento: c.departamento,
          municipio: c.municipio,
          zona: c.zona,
          comuna: c.comuna ?? '',
          corregimiento: c.corregimiento ?? '',
          barrio: c.barrio,
          puesto: c.puesto,
          mesa: String(c.mesa),
          nombres: f.nombres || c.nombres,
          apellidos: f.apellidos || c.apellidos,
        }))
        setHint({ tone: 'ok', text: `Censo encontrado: ${c.puestoNombre} · Mesa ${c.mesa}` })
      } else {
        setHint({ tone: 'warn', text: 'No está en censo: completa la ubicación manualmente.' })
      }
    } else {
      setHint(null)
    }
  }

  const onDepartamento = (dep: string) => {
    const muns = municipiosDe(dep)
    const mun = muns[0] ?? ''
    setForm((f) => ({ ...f, departamento: dep, municipio: mun, zona: 'Urbana', comuna: '', corregimiento: '', barrio: '', puesto: '', mesa: '' }))
  }

  const onMunicipio = (mun: string) => {
    const hasUrbana = PUESTOS.some((p) => p.municipio === mun && p.zona === 'Urbana')
    setForm((f) => ({ ...f, municipio: mun, zona: hasUrbana ? 'Urbana' : 'Rural', comuna: '', corregimiento: '', barrio: '', puesto: '', mesa: '' }))
  }

  const onZona = (z: ZonaGeografica) => {
    setForm((f) => ({ ...f, zona: z, comuna: '', corregimiento: '', barrio: '', puesto: '', mesa: '' }))
  }

  const onSector = (sector: string) => {
    setForm((f) => ({ ...f, comuna: f.zona === 'Urbana' ? sector : '', corregimiento: f.zona === 'Rural' ? sector : '', barrio: '', puesto: '', mesa: '' }))
  }

  const onBarrio = (b: string) => {
    const puestos = puestosDe(form.municipio, b)
    const pu = puestos[0]
    setForm((f) => ({ ...f, barrio: b, puesto: pu?.id ?? '', mesa: pu ? String(pu.mesaBase) : '' }))
  }

  const onPuesto = (pid: string) => {
    const p = buscarPuesto(pid)
    if (!p) return
    setForm((f) => ({
      ...f,
      puesto: pid,
      departamento: p.departamento,
      municipio: p.municipio,
      zona: p.zona,
      comuna: p.comuna ?? '',
      corregimiento: p.corregimiento ?? '',
      barrio: p.barrio,
      mesa: String(p.mesaBase),
    }))
  }

  const agregarVehiculo = () =>
    setForm((f) => ({
      ...f,
      vehiculos: [...f.vehiculos, { tipo: 'Automóvil', capacidadPasajeros: 4, aDisposicion: true, estado: 'Disponible' }],
    }))

  const quitarVehiculo = (i: number) =>
    setForm((f) => ({ ...f, vehiculos: f.vehiculos.filter((_, idx) => idx !== i) }))

  const patchVehiculo = (i: number, partial: Partial<Vehiculo>) =>
    setForm((f) => ({
      ...f,
      vehiculos: f.vehiculos.map((v, idx) => (idx === i ? { ...v, ...partial } : v)),
    }))

  const toggleInteres = (i: string) =>
    setForm((f) => ({
      ...f,
      intereses: f.intereses.includes(i) ? f.intereses.filter((x) => x !== i) : [...f.intereses, i],
    }))

  const toggleGrupo = (g: string) =>
    setForm((f) => ({
      ...f,
      gruposSociales: f.gruposSociales.includes(g) ? f.gruposSociales.filter((x) => x !== g) : [...f.gruposSociales, g],
    }))

  const esValido = form.departamento === DEPARTAMENTO_CAMPANA && form.municipio === MUNICIPIO_CAMPANA
  const validezMsg = esValido
    ? null
    : form.departamento === DEPARTAMENTO_CAMPANA
      ? { tone: 'warn' as const, text: '⚠️ Otro municipio del Cesar: esta persona NO vota en el Concejo de Valledupar.' }
      : { tone: 'err' as const, text: '🔴 Otro departamento: esta persona NO vota en el Concejo de Valledupar.' }

  const save = async () => {
    if (session?.rol === 'digitador' && !form.planillaCodigo.trim()) {
      notify('Ingresa el código de la planilla que estás digitando', 'error')
      return
    }
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.cedula.trim() || !form.fechaNacimiento || !form.telefono.trim()) {
      notify('Completa los datos personales obligatorios', 'error')
      return
    }
    if (!form.puesto || !form.mesa) {
      notify('Selecciona puesto y mesa (usa autocompletado censal)', 'error')
      return
    }
    if (!form.liderId) {
      notify('Selecciona un líder asignado', 'error')
      return
    }
    if (!form.habeasData) {
      notify('Debes autorizar el tratamiento de datos (Habeas Data)', 'error')
      return
    }
    const input: PersonaInput = {
      planillaCodigo: form.planillaCodigo.trim() || undefined,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      cedula: form.cedula.trim(),
      fechaNacimiento: form.fechaNacimiento,
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      direccion: form.direccion.trim(),
      departamento: form.departamento,
      municipio: form.municipio,
      zona: form.zona,
      comuna: form.comuna || undefined,
      corregimiento: form.corregimiento || undefined,
      barrio: form.barrio,
      puesto: form.puesto,
      mesa: Number(form.mesa) || 0,
      intereses: form.intereses,
      gruposSociales: form.gruposSociales,
      ocupacion: form.ocupacion,
      profesion: form.profesion,
      nivelAcademico: form.nivelAcademico,
      posgrado: form.posgrado,
      observacion: form.observacion.trim(),
      vehiculos: form.vehiculos.map((v) => ({ tipo: v.tipo, capacidadPasajeros: Number(v.capacidadPasajeros) || 0, aDisposicion: v.aDisposicion, estado: v.estado })),
      liderId: form.liderId,
      nivelVoto: form.nivelVoto,
      rolDiaE: form.rolDiaE,
      habeasData: form.habeasData,
    }
    await savePersona(input)
  }

  const titulo =
    personaModal?.mode === 'edit'
      ? 'Editar Ficha Técnica'
      : session?.rol === 'admin'
        ? 'Nueva Ficha Técnica'
        : 'Captura Rápida de Simpatizante'
  const subtitulo =
    personaModal?.mode === 'edit'
      ? cargando
        ? 'Cargando ficha…'
        : `${form.nombres} ${form.apellidos} · CC ${form.cedula}`
      : session?.rol === 'admin'
        ? 'Registro completo de simpatizante / líder'
        : 'Selecciona el líder al que pertenece el simpatizante'

  const comunas = comunasDe(form.municipio)
  const corregimientos = corregimientosDe(form.municipio)
  const barrios = barriosDe(form.municipio, form.zona, form.comuna, form.corregimiento)
  const puestos = puestosDe(form.municipio, form.barrio)
  const nDisp = form.vehiculos.filter((v) => v.aDisposicion).length
  const capDisp = form.vehiculos.filter((v) => v.aDisposicion).reduce((s, v) => s + (Number(v.capacidadPasajeros) || 0), 0)

  return (
    <Modal
      open={!!personaModal}
      onClose={closePersona}
      title={titulo}
      subtitle={subtitulo}
      wide
      footer={
        <>
          <button onClick={closePersona} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => void save()}
            disabled={cargando}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar ficha
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* 0 Ubicación electoral */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">Ubicación Electoral (Cesar · Valledupar)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Departamento" required>
              <select className={inputCls} value={form.departamento} onChange={(e) => onDepartamento(e.target.value)}>
                {DEPARTAMENTOS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Municipio" required>
              <select className={inputCls} value={form.municipio} onChange={(e) => onMunicipio(e.target.value)}>
                {municipiosDe(form.departamento).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Zona" required>
              <div className="flex gap-4 mt-1.5">
                <label className="inline-flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={form.zona === 'Urbana'} onChange={() => onZona('Urbana')} className="accent-blue-600" /> Urbana
                </label>
                <label className="inline-flex items-center gap-1.5 text-sm">
                  <input type="radio" checked={form.zona === 'Rural'} onChange={() => onZona('Rural')} className="accent-blue-600" /> Rural
                </label>
              </div>
            </Field>
            {form.zona === 'Urbana' ? (
              <Field label="Comuna" required>
                <select className={inputCls} value={form.comuna} onChange={(e) => onSector(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {comunas.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Corregimiento" required>
                <select className={inputCls} value={form.corregimiento} onChange={(e) => onSector(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {corregimientos.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Barrio" required>
              <select className={inputCls} value={form.barrio} onChange={(e) => onBarrio(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {barrios.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Puesto de votación" required>
              <select className={inputCls} value={form.puesto} onChange={(e) => onPuesto(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {puestos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mesa" required>
              <input type="number" className={inputCls} value={form.mesa} onChange={(e) => patch({ mesa: e.target.value })} placeholder="Ej: 204" />
            </Field>
          </div>
          {validezMsg && (
            <div
              className={`mt-3 rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
                validezMsg.tone === 'warn' ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" /> {validezMsg.text}
            </div>
          )}
          {esValido && form.municipio && (
            <div className="mt-3 rounded-lg px-3 py-2 text-sm flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Elector válido: vota en el Concejo de Valledupar.
            </div>
          )}
        </div>

        {/* 1 Datos personales */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">1 · Datos Personales</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombres" required>
              <input className={inputCls} value={form.nombres} onChange={(e) => patch({ nombres: e.target.value })} placeholder="Ej: Luis Fernando" />
            </Field>
            <Field label="Apellidos" required>
              <input className={inputCls} value={form.apellidos} onChange={(e) => patch({ apellidos: e.target.value })} placeholder="Ej: Pérez Gómez" />
            </Field>
            <Field label="Cédula (autocompletado censal)" required>
              <input className={`${inputCls} font-mono`} value={form.cedula} onChange={(e) => onCedula(e.target.value)} placeholder="Ej: 1030000000" maxLength={10} />
              {hint && (
                <div className={`text-[11px] mt-1 ${hint.tone === 'ok' ? 'text-emerald-600' : hint.tone === 'warn' ? 'text-amber-600' : 'text-red-600'}`}>
                  {hint.text}
                </div>
              )}
            </Field>
            <Field label="Fecha de nacimiento" required>
              <input type="date" className={inputCls} value={form.fechaNacimiento} onChange={(e) => patch({ fechaNacimiento: e.target.value })} />
            </Field>
            <Field label="Teléfono / WhatsApp" required>
              <input className={inputCls} value={form.telefono} onChange={(e) => patch({ telefono: e.target.value })} placeholder="Ej: 3001234567" maxLength={10} />
            </Field>
            <Field label="Correo">
              <input type="email" className={inputCls} value={form.correo} onChange={(e) => patch({ correo: e.target.value })} placeholder="correo@ejemplo.com" />
            </Field>
            <Field label="Dirección residencial" className="sm:col-span-2">
              <input className={inputCls} value={form.direccion} onChange={(e) => patch({ direccion: e.target.value })} placeholder="Calle 45 # 12-30" />
            </Field>
          </div>
        </div>

        {/* 2 Caracterización social */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">2 · Caracterización Social</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ocupación (actual)">
              <select className={inputCls} value={form.ocupacion} onChange={(e) => patch({ ocupacion: e.target.value })}>
                {OCUPACIONES.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
            <Field label="Profesión">
              <select className={inputCls} value={form.profesion} onChange={(e) => patch({ profesion: e.target.value })}>
                <option value="Sin profesión">Sin profesión</option>
                {PROFESIONES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Nivel académico">
              <select className={inputCls} value={form.nivelAcademico} onChange={(e) => patch({ nivelAcademico: e.target.value as NivelAcademico })}>
                {NIVELES_ACADEMICOS.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
            <Field label="Posgrado">
              <select className={inputCls} value={form.posgrado} onChange={(e) => patch({ posgrado: e.target.value as Posgrado })}>
                {POSGRADOS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Gustos e Intereses" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2 mt-1.5">
                {INTERESES.map((i) => (
                  <label
                    key={i}
                    className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 cursor-pointer border ${
                      form.intereses.includes(i) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input type="checkbox" checked={form.intereses.includes(i)} onChange={() => toggleInteres(i)} className="accent-blue-600" />
                    {i}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Grupos sociales" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2 mt-1.5">
                {GRUPOS_SOCIALES.map((g) => (
                  <label
                    key={g}
                    className={`inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 cursor-pointer border ${
                      form.gruposSociales.includes(g) ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input type="checkbox" checked={form.gruposSociales.includes(g)} onChange={() => toggleGrupo(g)} className="accent-blue-600" />
                    {g}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Observación (datos adicionales)" className="sm:col-span-2">
              <textarea
                rows={2}
                className={`${inputCls} resize-none`}
                value={form.observacion}
                onChange={(e) => patch({ observacion: e.target.value })}
                placeholder="Cualquier dato adicional del simpatizante..."
              />
            </Field>
          </div>
        </div>

        {/* 3 Logística Día E — Vehículos */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">3 · Logística Día "E" (Vehículos)</h4>
          {form.vehiculos.length === 0 && <p className="text-sm text-slate-400 mb-2">Sin vehículos registrados.</p>}
          <div className="space-y-2">
            {form.vehiculos.map((v, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_130px_auto_auto] gap-3 items-end border border-slate-200 rounded-lg p-3">
                <Field label={`Vehículo ${i + 1} · Tipo`}>
                  <select className={inputCls} value={v.tipo} onChange={(e) => patchVehiculo(i, { tipo: e.target.value as TipoVehiculo })}>
                    <option>Moto</option>
                    <option>Automóvil</option>
                    <option>Camioneta</option>
                    <option>Bus</option>
                  </select>
                </Field>
                <Field label="Capacidad (pax)">
                  <input
                    type="number"
                    min={1}
                    max={60}
                    className={inputCls}
                    value={v.capacidadPasajeros}
                    onChange={(e) => patchVehiculo(i, { capacidadPasajeros: Number(e.target.value) || 0 })}
                  />
                </Field>
                <label className="inline-flex items-center gap-1.5 text-sm pb-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={v.aDisposicion}
                    onChange={(e) => patchVehiculo(i, { aDisposicion: e.target.checked })}
                    className="accent-blue-600"
                  />
                  A disposición
                </label>
                <button onClick={() => quitarVehiculo(i)} className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline pb-2.5">
                  <Trash2 className="w-3.5 h-3.5" /> Quitar
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={agregarVehiculo}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
          >
            <Plus className="w-4 h-4" /> Agregar vehículo
          </button>
          {form.vehiculos.length > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              {form.vehiculos.length} vehículo{form.vehiculos.length > 1 ? 's' : ''} · {nDisp} a disposición · Capacidad Día E: <b>{capDisp} pax</b>
            </div>
          )}
        </div>

        {/* 4 Vinculación */}
        <div>
          <Field label="Código de planilla" required={session?.rol === 'digitador'}>
            <input className={inputCls} maxLength={80} value={form.planillaCodigo} onChange={(e) => patch({ planillaCodigo: e.target.value })} placeholder="Código de la planilla física" />
          </Field>
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">4 · Vinculación y Compromiso</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Líder asignado" required>
              <select className={inputCls} value={form.liderId} onChange={(e) => patch({ liderId: e.target.value })}>
                <option value="">— Seleccionar —</option>
                {lideresDisponibles.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombres} {l.apellidos}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nivel de voto" required>
              <select className={inputCls} value={form.nivelVoto} onChange={(e) => patch({ nivelVoto: e.target.value as NivelVoto })}>
                <option>Firme</option>
                <option>Indeciso</option>
                <option>En Riesgo</option>
              </select>
            </Field>
            <Field label="Rol asignado Día E" required>
              <select className={inputCls} value={form.rolDiaE} onChange={(e) => patch({ rolDiaE: e.target.value as RolDiaE })}>
                <option>Votante</option>
                <option>Conductor</option>
                <option>Testigo electoral</option>
              </select>
            </Field>
          </div>
        </div>

        {/* 5 Legal */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2">5 · Legal — Habeas Data</h4>
          <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.habeasData} onChange={(e) => patch({ habeasData: e.target.checked })} className="mt-0.5 accent-blue-600" />
            <span>
              Autorizo de manera libre, previa, expresa e informada el tratamiento de mis datos personales conforme a la
              Ley 1581 de 2012 (Habeas Data) para fines de la campaña. <span className="text-red-500">* obligatorio</span>
            </span>
          </label>
        </div>
      </div>
    </Modal>
  )
}
