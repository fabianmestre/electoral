import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { CATEGORIAS } from '../data'
import { ROL_SIMPATIZANTE_LABEL } from '../types'
import type { CategoriaGestion, EstadoGestion, GestionApiInput, SimpatizanteApi } from '../types'
import { Field, Modal, inputCls } from './ui'
import { hoyISO } from '../lib'

interface FormState {
  simpatizanteId: string
  fecha: string
  categoria: CategoriaGestion
  descripcion: string
  monto: number
  estado: EstadoGestion
  responsable: string
}

const emptyForm = (personaId: string, responsable: string): FormState => ({
  simpatizanteId: personaId,
  fecha: hoyISO(),
  categoria: 'Salud',
  descripcion: '',
  monto: 0,
  estado: 'Pendiente',
  responsable,
})

const GENERAL = '— Sin simpatizante (gestión general) —'
const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Selector de persona que se filtra escribiendo nombre o cédula.
function PersonaPicker({ personas, value, onChange, detalle }: {
  personas: SimpatizanteApi[]
  value: string
  onChange: (id: string) => void
  detalle: (p: SimpatizanteApi) => string
}) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const seleccionada = personas.find((p) => p.id === value)
  const etiqueta = seleccionada ? `${seleccionada.nombres} ${seleccionada.apellidos}` : ''
  const resultados = useMemo(() => {
    const q = normalizar(texto.trim())
    return personas
      .filter((p) => !q || normalizar(`${p.nombres} ${p.apellidos} ${p.cedula}`).includes(q))
      .sort((a, b) => a.nombres.localeCompare(b.nombres))
      .slice(0, 50)
  }, [personas, texto])
  useEffect(() => {
    const cerrar = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [])
  const elegir = (id: string) => { onChange(id); setTexto(''); setAbierto(false) }
  return (
    <div ref={ref} className="relative">
      <input
        className={inputCls}
        value={abierto ? texto : etiqueta}
        placeholder="Escribe nombre o cédula…"
        onFocus={() => { setTexto(''); setAbierto(true) }}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setAbierto(false)
          if (e.key === 'Enter') { e.preventDefault(); if (resultados[0]) elegir(resultados[0].id) }
        }}
      />
      {abierto && (
        <ul className="absolute z-20 mt-1 max-h-[8.5rem] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {!texto.trim() && <li><button type="button" onClick={() => elegir('')} className="w-full px-3 py-2 text-left text-slate-500 hover:bg-slate-50">{GENERAL}</button></li>}
          {resultados.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => elegir(p.id)} className={`w-full px-3 py-2 text-left hover:bg-blue-50 ${p.id === value ? 'bg-blue-50' : ''}`}>
                <span className="block font-medium text-slate-800">{p.nombres} {p.apellidos}</span>
                <span className="block text-xs text-slate-500">{detalle(p)}</span>
              </button>
            </li>
          ))}
          {resultados.length === 0 && <li className="px-3 py-2 text-slate-400">Sin coincidencias para “{texto}”.</li>}
        </ul>
      )}
    </div>
  )
}

export default function GestionForm() {
  const { gestionModal, closeGestion, session, simpatizantesApi, lideresApi, gestionesApi, crearGestionApi, editarGestionApi, notify } = useApp()
  const [form, setForm] = useState<FormState>(() => emptyForm('', ''))
  const [guardando, setGuardando] = useState(false)

  const nombreLiderApi = (id: string) => {
    const l = lideresApi.find((x) => x.id === id)
    return l ? `${l.nombres} ${l.apellidos}` : '—'
  }

  useEffect(() => {
    if (!gestionModal) return
    if (gestionModal.mode === 'edit' && gestionModal.gestionId) {
      const g = gestionesApi.find((x) => x.id === gestionModal.gestionId)
      if (g) {
        setForm({
          simpatizanteId: g.simpatizanteId ?? '',
          fecha: g.fecha,
          categoria: g.categoria,
          descripcion: g.descripcion,
          monto: g.monto,
          estado: g.estado,
          responsable: g.responsable,
        })
      }
    } else {
      setForm(emptyForm(gestionModal.personaId ?? '', session?.nombre ?? ''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestionModal])

  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }))

  const save = async () => {
    if (!form.fecha || !form.descripcion.trim() || !form.responsable.trim()) {
      notify('Completa todos los campos obligatorios', 'error')
      return
    }
    const input: GestionApiInput = {
      simpatizanteId: form.simpatizanteId || null,
      fecha: form.fecha,
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto) || 0,
      estado: form.estado,
      responsable: form.responsable.trim(),
    }
    setGuardando(true)
    const ok = gestionModal?.mode === 'edit' && gestionModal.gestionId
      ? await editarGestionApi(gestionModal.gestionId, input)
      : await crearGestionApi(input)
    setGuardando(false)
    if (ok) closeGestion()
  }

  return (
    <Modal
      open={!!gestionModal}
      onClose={closeGestion}
      title={gestionModal?.mode === 'edit' ? 'Editar gestión' : 'Registrar gestión / favor'}
      subtitle="Trazabilidad de favores y compromisos"
      footer={
        <>
          <button onClick={closeGestion} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button
            onClick={() => void save()}
            disabled={guardando}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? 'Guardando…' : 'Guardar gestión'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Persona (simpatizante / líder)">
          <PersonaPicker
            personas={simpatizantesApi}
            value={form.simpatizanteId}
            onChange={(id) => patch({ simpatizanteId: id })}
            detalle={(p) => `${ROL_SIMPATIZANTE_LABEL[p.rol ?? 'simpatizante']} · ${p.cedula}${p.rol === 'simpatizante' || !p.rol ? ` · ${nombreLiderApi(p.liderId)}` : ''}`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha" required>
            <input type="date" className={inputCls} value={form.fecha} onChange={(e) => patch({ fecha: e.target.value })} />
          </Field>
          <Field label="Categoría" required>
            <select className={inputCls} value={form.categoria} onChange={(e) => patch({ categoria: e.target.value as CategoriaGestion })}>
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Descripción del favor / compromiso" required>
          <textarea
            rows={3}
            className={`${inputCls} resize-none`}
            value={form.descripcion}
            onChange={(e) => patch({ descripcion: e.target.value })}
            placeholder="Detalle de la gestión realizada o compromiso adquirido..."
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor / Monto ($)">
            <input type="number" min={0} step={1000} className={inputCls} value={form.monto} onChange={(e) => patch({ monto: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Estado" required>
            <select className={inputCls} value={form.estado} onChange={(e) => patch({ estado: e.target.value as EstadoGestion })}>
              <option>Pendiente</option>
              <option>En Proceso</option>
              <option>Resuelto</option>
              <option>Cancelado</option>
            </select>
          </Field>
        </div>
        <Field label="Responsable de la campaña" required>
          <input className={inputCls} value={form.responsable} onChange={(e) => patch({ responsable: e.target.value })} placeholder="Nombre del responsable" />
        </Field>
      </div>
    </Modal>
  )
}
