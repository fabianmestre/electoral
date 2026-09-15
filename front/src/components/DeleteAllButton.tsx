import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Modal, inputCls } from './ui'
import { useApp } from '../store'

export default function DeleteAllButton({ resource, count, disabled = false, onDeleted }: {
  resource: 'padrinos' | 'lideres'; count: number; disabled?: boolean; onDeleted: () => void | Promise<void>
}) {
  const { session, notify } = useApp()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (session?.rol !== 'admin') return null
  function close() {
    if (busy) return
    setOpen(false); setConfirmation(''); setError('')
  }
  async function removeAll() {
    if (busy || confirmation !== 'BORRAR') return
    setBusy(true)
    setError('')
    try {
      const token = sessionStorage.getItem('electoral.auth.token')
      if (!token) throw new Error('Inicia sesión de nuevo para continuar.')
      const response = await fetch(`/api/${resource}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo completar el borrado.')
      setOpen(false); setConfirmation('')
      notify(`${data.eliminados} ${resource === 'lideres' ? 'líderes' : 'padrinos'} eliminados.`, 'success')
      await onDeleted()
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo completar el borrado.') }
    finally { setBusy(false) }
  }
  const label = resource === 'lideres' ? 'líderes' : 'padrinos'
  return <>
    <button type="button" onClick={() => setOpen(true)} disabled={disabled || count === 0 || busy} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">
      <Trash2 className="w-4 h-4" /> Borrar todos
    </button>
    <Modal open={open} onClose={close} title={`Borrar todos los ${label}`} footer={<>
      <button type="button" disabled={busy} onClick={close} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
      <button type="button" disabled={busy || confirmation !== 'BORRAR'} onClick={() => void removeAll()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40">{busy ? 'Borrando…' : 'Borrar todos'}</button>
    </>}>
      <p className="text-sm text-slate-600 mb-3">Eliminarás todos los {label}, incluidos los inactivos. Esta acción no se puede deshacer.{resource === 'padrinos' ? ' También se eliminarán sus cuentas de acceso.' : ''}</p>
      <p className="text-sm text-slate-600 mb-3">Si existen datos asociados, el borrado se bloqueará para conservarlos.</p>
      <label className="block text-sm text-slate-700">Escribe BORRAR para confirmar<input autoFocus className={inputCls} value={confirmation} disabled={busy} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" /></label>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  </>
}
