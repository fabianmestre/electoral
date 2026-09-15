import { useEffect, useMemo, useState } from 'react'
import type { LiderApi, UsuarioApi } from '../types'
import { Modal, inputCls } from './ui'

interface Props {
  open: boolean
  lideres: LiderApi[]
  usuarios: UsuarioApi[]
  onClose: () => void
  onSaved: () => Promise<void>
  notify: (message: string, type?: 'success' | 'error') => void
  embedded?: boolean
  defaultLiderId?: string
}

const initial = { nombreCompleto: '', cedula: '', celular: '', direccion: '', departamento: 'Cesar', municipio: 'Valledupar', barrio: '', puesto: '', mesa: '', liderId: '', tieneVehiculo: false, tipoVehiculo: '' }

export default function CapturaPlanillaModal({ open, lideres, usuarios, onClose, onSaved, notify, embedded = false, defaultLiderId = '' }: Props) {
  const [form, setForm] = useState({ ...initial, liderId: defaultLiderId })
  const [busy, setBusy] = useState(false)
  const lider = lideres.find((item) => item.id === form.liderId)
  const padrino = usuarios.find((item) => item.id === lider?.padrinoId)
  useEffect(() => { if (defaultLiderId) setForm((current) => ({ ...current, liderId: defaultLiderId })) }, [defaultLiderId])
  const valido = useMemo(() => Boolean(
    form.nombreCompleto.trim().includes(' ') && /^[0-9]{6,10}$/.test(form.cedula)
    && form.celular.trim() && form.direccion.trim() && form.departamento.trim() && form.municipio.trim() && form.barrio.trim() && form.puesto.trim()
    && form.mesa && form.liderId && (!form.tieneVehiculo || form.tipoVehiculo)
  ), [form])

  function close() {
    if (busy) return
    setForm({ ...initial, liderId: defaultLiderId })
    onClose()
  }

  async function submit() {
    if (!valido || busy) return
    setBusy(true)
    try {
      const response = await fetch('/api/digitacion/planillas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}` },
        body: JSON.stringify({ ...form, mesa: Number(form.mesa), tipoVehiculo: form.tieneVehiculo ? form.tipoVehiculo : null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la fila de la planilla.')
      await onSaved()
      notify('Fila de planilla guardada con su líder y padrino asociados.', 'success')
      setForm({ ...initial, liderId: defaultLiderId })
      onClose()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No se pudo guardar la fila.', 'error')
    } finally { setBusy(false) }
  }

  const patch = (values: Partial<typeof initial>) => setForm((current) => ({ ...current, ...values }))
  const numeric = (value: string) => value.replace(/\D/g, '')

  const fields = <form id="captura-planilla" onSubmit={(event) => { event.preventDefault(); void submit() }} className="grid gap-3 sm:grid-cols-2">
      {!defaultLiderId && <label className="text-sm sm:col-span-2">Líder al que pertenece *<select autoFocus required className={inputCls} value={form.liderId} onChange={(e) => patch({ liderId: e.target.value })}><option value="">— Seleccionar líder —</option>{lideres.map((item) => <option key={item.id} value={item.id}>{item.nombres} {item.apellidos}</option>)}</select></label>}
      {form.liderId && <div className="sm:col-span-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">Líder: <strong>{lider ? `${lider.nombres} ${lider.apellidos}` : 'Cuenta actual'}</strong> · Padrino: <strong>{padrino?.nombre || 'Asociado automáticamente'}</strong></div>}
      <label className="text-sm sm:col-span-2">Nombre y apellidos *<input autoFocus={Boolean(defaultLiderId)} required maxLength={200} className={inputCls} value={form.nombreCompleto} onChange={(e) => patch({ nombreCompleto: e.target.value })} /></label>
      <label className="text-sm">Cédula *<input required inputMode="numeric" maxLength={10} className={inputCls} value={form.cedula} onChange={(e) => patch({ cedula: numeric(e.target.value) })} /></label>
      <label className="text-sm">Celular *<input required inputMode="tel" maxLength={30} className={inputCls} value={form.celular} onChange={(e) => patch({ celular: e.target.value })} /></label>
      <label className="text-sm sm:col-span-2">Dirección de residencia *<input required maxLength={300} className={inputCls} value={form.direccion} onChange={(e) => patch({ direccion: e.target.value })} /></label>
      <label className="text-sm">Departamento *<input required maxLength={100} className={inputCls} value={form.departamento} onChange={(e) => patch({ departamento: e.target.value })} /></label>
      <label className="text-sm">Municipio *<input required maxLength={100} className={inputCls} value={form.municipio} onChange={(e) => patch({ municipio: e.target.value })} /></label>
      <label className="text-sm">Barrio *<input required maxLength={150} className={inputCls} value={form.barrio} onChange={(e) => patch({ barrio: e.target.value })} /></label>
      <label className="text-sm">Lugar de votación *<input required maxLength={150} className={inputCls} value={form.puesto} onChange={(e) => patch({ puesto: e.target.value })} /></label>
      <label className="text-sm">Mesa *<input required min="1" type="number" className={inputCls} value={form.mesa} onChange={(e) => patch({ mesa: e.target.value })} /></label>
      <fieldset className="text-sm"><legend className="mb-2">¿Tiene vehículo? *</legend><div className="flex gap-5"><label><input type="radio" checked={form.tieneVehiculo} onChange={() => patch({ tieneVehiculo: true })} /> Sí</label><label><input type="radio" checked={!form.tieneVehiculo} onChange={() => patch({ tieneVehiculo: false, tipoVehiculo: '' })} /> No</label></div></fieldset>
      <label className="text-sm sm:col-span-2">Carro / moto{form.tieneVehiculo ? ' *' : ''}<select required={form.tieneVehiculo} disabled={!form.tieneVehiculo} className={inputCls} value={form.tipoVehiculo} onChange={(e) => patch({ tipoVehiculo: e.target.value })}><option value="">— Seleccionar —</option><option>Carro</option><option>Moto</option></select></label>
      <p className="sm:col-span-2 text-xs text-slate-500">Esta captura conserva únicamente la información de la planilla. La ficha queda pendiente de completar y de registrar la autorización de tratamiento de datos.</p>
      {embedded && <div className="sm:col-span-2 flex justify-end pt-2"><button type="submit" disabled={busy || !valido} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Guardando…' : 'Guardar y continuar'}</button></div>}
    </form>

  if (embedded) return fields
  return <Modal open={open} onClose={close} title="Capturar fila de planilla" footer={<>
    <button type="button" onClick={close} disabled={busy} className="px-4 py-2 text-sm">Cancelar</button>
    <button type="submit" form="captura-planilla" disabled={busy || !valido} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Guardando…' : 'Guardar fila'}</button>
  </>}>
    {fields}
  </Modal>
}
