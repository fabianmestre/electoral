import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useApp } from '../store'
import type { LiderApi, LiderApiInput } from '../types'
import { Badge, Field, Modal, inputCls } from '../components/ui'
import DeleteAllButton from '../components/DeleteAllButton'

interface FormState {
  nombres: string
  apellidos: string
  cedula: string
  correo: string
  padrinoId: string
  activo: boolean
}

const emptyForm = (padrinoId: string): FormState => ({
  nombres: '',
  apellidos: '',
  cedula: '',
  correo: '',
  padrinoId,
  activo: true,
})

const liderToForm = (l: LiderApi): FormState => ({
  nombres: l.nombres,
  apellidos: l.apellidos,
  cedula: l.cedula,
  correo: l.correo ?? '',
  padrinoId: l.padrinoId,
  activo: l.activo,
})

export default function GestionLideres() {
  const { lideresApi, usuariosApi, cargandoLideres, cargarLideresApi, crearLiderApi, editarLiderApi, eliminarLiderApi, notify } = useApp()
  const [modal, setModal] = useState<{ mode: 'new' | 'edit'; liderId?: string } | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm(''))
  const [guardando, setGuardando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const padrinos = useMemo(() => usuariosApi.filter((u) => u.rol === 'padrino'), [usuariosApi])
  const nombrePadrino = (id: string) => usuariosApi.find((u) => u.id === id)?.nombre ?? '—'

  useEffect(() => {
    void cargarLideresApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = (partial: Partial<FormState>) => setForm((f) => ({ ...f, ...partial }))

  const abrirNuevo = () => {
    setForm(emptyForm(padrinos[0]?.id ?? ''))
    setModal({ mode: 'new' })
  }

  const abrirEditar = (l: LiderApi) => {
    setForm(liderToForm(l))
    setModal({ mode: 'edit', liderId: l.id })
  }

  const cerrar = () => setModal(null)

  const guardar = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) { notify('Ingresa un correo válido para el líder', 'error'); return }
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.cedula.trim()) {
      notify('Completa nombres, apellidos y cédula', 'error')
      return
    }
    if (!form.padrinoId) {
      notify('Selecciona el padrino que apadrina a este líder', 'error')
      return
    }
    const datos: LiderApiInput = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      cedula: form.cedula.trim(),
      correo: form.correo.trim(),
      meta: lideresApi.find((l) => l.id === modal?.liderId)?.meta ?? 0,
      territorio: lideresApi.find((l) => l.id === modal?.liderId)?.territorio ?? null,
      rolDiaE: lideresApi.find((l) => l.id === modal?.liderId)?.rolDiaE ?? 'Votante',
      padrinoId: form.padrinoId,
      activo: form.activo,
    }
    setGuardando(true)
    const ok = modal?.mode === 'edit' && modal.liderId
      ? await editarLiderApi(modal.liderId, datos)
      : await crearLiderApi(datos)
    setGuardando(false)
    if (ok) cerrar()
  }

  const eliminar = async (l: LiderApi) => {
    if (!window.confirm(`¿Eliminar al líder ${l.nombres} ${l.apellidos}? Esta acción no se puede deshacer.`)) return
    setEliminandoId(l.id)
    try {
      await eliminarLiderApi(l.id)
    } finally {
      setEliminandoId(null)
    }
  }

  const lideresOrdenados = useMemo(
    () => [...lideresApi].sort((a, b) => a.nombres.localeCompare(b.nombres)),
    [lideresApi],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">
          Líderes de campaña, cada uno apadrinado por un miembro del equipo. {lideresApi.length} registrados.
        </p>
        <div className="flex flex-wrap gap-2">
        <DeleteAllButton resource="lideres" count={lideresApi.length} disabled={cargandoLideres || guardando || !!eliminandoId} onDeleted={cargarLideresApi} />
        <button
          onClick={abrirNuevo}
          disabled={padrinos.length === 0}
          title={padrinos.length === 0 ? 'Primero crea un padrino en Gestión de Padrinos' : undefined}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" /> Nuevo líder
        </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Líder', 'Correo', 'Cédula', 'Padrino', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 px-2.5 py-2 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lideresOrdenados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-2.5 py-10 text-slate-400 text-xs text-center">
                    {cargandoLideres ? 'Cargando líderes…' : 'Sin líderes registrados todavía.'}
                  </td>
                </tr>
              )}
              {lideresOrdenados.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 border-b border-slate-100">
                  <td className="px-2.5 py-1.5 text-xs font-medium text-slate-800 whitespace-nowrap">{l.nombres} {l.apellidos}</td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600">{l.correo || '—'}</td>
                  <td className="px-2.5 py-1.5 font-mono text-slate-600 text-xs whitespace-nowrap">{l.cedula}</td>
                  <td className="px-2.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">{nombrePadrino(l.padrinoId)}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <Badge className={l.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                      {l.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-2.5 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => abrirEditar(l)}
                        title="Editar líder"
                        className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => void eliminar(l)}
                        disabled={eliminandoId === l.id}
                        title="Eliminar líder"
                        className="p-1 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {padrinos.length === 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Users className="w-4 h-4 shrink-0" /> No hay padrinos activos todavía: crea uno en Gestión de Padrinos antes de registrar líderes.
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={cerrar}
        title={modal?.mode === 'edit' ? 'Editar líder' : 'Nuevo líder'}
        subtitle={modal?.mode === 'edit' ? `${form.nombres} ${form.apellidos}` : 'Registrar un nuevo líder de campaña'}
        footer={
          <>
            <button onClick={cerrar} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancelar
            </button>
            <button
              onClick={() => void guardar()}
              disabled={guardando}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? 'Guardando…' : 'Guardar líder'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nombres" required>
            <input className={inputCls} value={form.nombres} onChange={(e) => patch({ nombres: e.target.value })} placeholder="Ej: Andrés" />
          </Field>
          <Field label="Apellidos" required>
            <input className={inputCls} value={form.apellidos} onChange={(e) => patch({ apellidos: e.target.value })} placeholder="Ej: Ramírez Muñoz" />
          </Field>
          <Field label="Cédula" required>
            <input className={`${inputCls} font-mono`} value={form.cedula} onChange={(e) => patch({ cedula: e.target.value })} placeholder="Ej: 1111000001" maxLength={10} />
          </Field>
          <Field label="Correo" required>
            <input type="email" maxLength={254} className={inputCls} value={form.correo} onChange={(e) => patch({ correo: e.target.value })} />
            <p className="mt-1 text-xs text-slate-500">Contraseña inicial: la cédula.</p>
          </Field>
          <Field label="Padrino asignado" required>
            <select className={inputCls} value={form.padrinoId} onChange={(e) => patch({ padrinoId: e.target.value })}>
              <option value="">— Seleccionar —</option>
              {padrinos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </Field>
          {modal?.mode === 'edit' && (
            <Field label="Estado">
              <label className="inline-flex items-center gap-1.5 text-sm mt-1.5 cursor-pointer">
                <input type="checkbox" checked={form.activo} onChange={(e) => patch({ activo: e.target.checked })} className="accent-blue-600" />
                Líder activo
              </label>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  )
}
