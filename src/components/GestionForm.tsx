import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store'
import { CATEGORIAS, lideresDePadrino, nombreLider } from '../data'
import type { CategoriaGestion, EstadoGestion, GestionInput } from '../types'
import { Field, Modal, inputCls } from './ui'
import { hoyISO } from '../lib'

interface FormState {
  personaId: string
  fecha: string
  categoria: CategoriaGestion
  descripcion: string
  monto: number
  estado: EstadoGestion
  responsable: string
}

export default function GestionForm() {
  const { gestionModal, closeGestion, session, db, saveGestion, notify } = useApp()
  const [form, setForm] = useState<FormState>({
    personaId: '',
    fecha: hoyISO(),
    categoria: 'Salud',
    descripcion: '',
    monto: 0,
    estado: 'Pendiente',
    responsable: session?.nombre ?? '',
  })

  const personas = useMemo(() => {
    if (session?.rol === 'admin') return db.personas
    if (session?.rol === 'padrino') {
      const ids = new Set(lideresDePadrino(db, session.padrinoId ?? '').map((l) => l.id))
      return db.personas.filter((p) => p.liderId && ids.has(p.liderId))
    }
    return db.personas
  }, [db, session])

  useEffect(() => {
    if (!gestionModal) return
    if (gestionModal.mode === 'edit') {
      const g = db.gestiones.find((x) => x.id === gestionModal.gestionId)
      if (g) {
        setForm({
          personaId: g.personaId ?? '',
          fecha: g.fecha,
          categoria: g.categoria,
          descripcion: g.descripcion,
          monto: g.monto,
          estado: g.estado,
          responsable: g.responsable,
        })
      }
    } else {
      setForm({
        personaId: gestionModal.personaId ?? personas[0]?.id ?? '',
        fecha: hoyISO(),
        categoria: 'Salud',
        descripcion: '',
        monto: 0,
        estado: 'Pendiente',
        responsable: session?.nombre ?? '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestionModal])

  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }))

  const save = () => {
    if (!form.fecha || !form.descripcion.trim() || !form.responsable.trim()) {
      notify('Completa todos los campos obligatorios', 'error')
      return
    }
    const input: GestionInput = {
      personaId: form.personaId,
      fecha: form.fecha,
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      monto: Number(form.monto) || 0,
      estado: form.estado,
      responsable: form.responsable.trim(),
    }
    saveGestion(input)
    notify(gestionModal?.mode === 'edit' ? 'Gestión actualizada' : 'Gestión registrada', 'success')
  }

  return (
    <Modal
      open={!!gestionModal}
      onClose={closeGestion}
      title={gestionModal?.mode === 'edit' ? 'Editar gestión' : 'Registrar gestión / favor'}
      subtitle={gestionModal?.mode === 'edit' ? `ID ${gestionModal.gestionId}` : 'Trazabilidad de favores y compromisos'}
      footer={
        <>
          <button onClick={closeGestion} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </button>
          <button onClick={save} className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
            Guardar gestión
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Persona (SIMPATIZANTE / LÍDER)">
          <select className={inputCls} value={form.personaId} onChange={(e) => patch({ personaId: e.target.value })}>
            <option value="">— Sin simpatizante (gestión general) —</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombres} {p.apellidos} {p.esLider ? '(Líder)' : ''} — {nombreLider(p.liderId)}
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
