import { useEffect, useState } from 'react'
import { Badge, Card, Modal, inputCls } from '../components/ui'
import { useApp } from '../store'

interface Gestor { id: string; nombre: string; email: string | null; cedula: string; activo: boolean }
const buttonCls = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40'

async function request(path = '', options: RequestInit = {}) {
  const response = await fetch(`/api/gestores${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}`, ...options.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.')
  return data
}

export default function GestoresAdmin() {
  const { notify } = useApp()
  const [items, setItems] = useState<Gestor[]>([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', cedula: '' })

  useEffect(() => {
    void request().then((data) => setItems(data.items)).catch((e) => notify(e.message, 'error'))
    // La lista se carga una sola vez al entrar al módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const valid = form.nombre.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && /^[0-9]{6,10}$/.test(form.cedula)

  async function create() {
    setBusy(true)
    try {
      const item = await request('', { method: 'POST', body: JSON.stringify(form) })
      setItems((current) => [...current, item]); setOpen(false); setForm({ nombre: '', email: '', cedula: '' })
      notify('Gestor creado. Su contraseña inicial es la cédula.', 'success')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo crear el gestor.', 'error') } finally { setBusy(false) }
  }

  async function toggle(item: Gestor) {
    setBusy(true)
    try { await request(`/${item.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !item.activo }) }); setItems((all) => all.map((x) => x.id === item.id ? { ...x, activo: !x.activo } : x)) }
    catch (e) { notify(e instanceof Error ? e.message : 'No se pudo actualizar.', 'error') } finally { setBusy(false) }
  }

  return <>
    <Card title="Gestores de información" action={<button className={buttonCls} onClick={() => setOpen(true)}>+ Nuevo gestor</button>}>
      <p className="mb-4 text-sm text-slate-500">Pueden consultar todas las fichas de simpatizantes y completar o corregir su información.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50"><tr>{['Nombre', 'Correo', 'Cédula', 'Estado', 'Acción'].map((x) => <th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>
        {!items.length && <tr><td colSpan={5} className="p-4 text-slate-500">Sin gestores registrados.</td></tr>}
        {items.map((item) => <tr className="border-b border-slate-100" key={item.id}><td className="p-3">{item.nombre}</td><td className="p-3">{item.email}</td><td className="p-3">{item.cedula}</td><td className="p-3"><Badge className={item.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>{item.activo ? 'Activo' : 'Inactivo'}</Badge></td><td className="p-3"><button disabled={busy} className="text-blue-600" onClick={() => void toggle(item)}>{item.activo ? 'Desactivar' : 'Activar'}</button></td></tr>)}
      </tbody></table></div>
    </Card>
    <Modal open={open} onClose={() => !busy && setOpen(false)} title="Nuevo gestor" footer={<><button className="px-4 py-2 text-sm" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" form="gestor-form" disabled={busy || !valid} className={buttonCls}>{busy ? 'Creando…' : 'Crear gestor'}</button></>}>
      <p className="mb-3 text-sm text-slate-500">La contraseña inicial será la cédula.</p>
      <form id="gestor-form" className="space-y-3" onSubmit={(e) => { e.preventDefault(); void create() }}><label className="block text-sm">Nombre completo *<input autoFocus required className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label><label className="block text-sm">Correo *<input type="email" required className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="block text-sm">Cédula *<input required inputMode="numeric" maxLength={10} className={inputCls} value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value.replace(/\D/g, '') })} /></label></form>
    </Modal>
  </>
}
