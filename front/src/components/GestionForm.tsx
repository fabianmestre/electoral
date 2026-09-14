import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { CATEGORIAS } from '../data'
import type { CategoriaGestion, EstadoGestion, GestionApiInput } from '../types'
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
      setForm(emptyForm(gestionModal.personaId ?? simpatizantesApi[0]?.id ?? '', session?.nombre ?? ''))
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
          <select className={inputCls} value={form.simpatizanteId} onChange={(e) => patch({ simpatizanteId: e.target.value })}>
            <option value="">— Sin simpatizante (gestión general) —</option>
            {simpatizantesApi.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombres} {p.apellidos} — {nombreLiderApi(p.liderId)}
              </option>
            ))}
          </select>
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
