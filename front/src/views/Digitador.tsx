import { useEffect, useState } from 'react'
import { Badge, Card, Modal, inputCls } from '../components/ui'
import { useApp } from '../store'
import CapturaPlanillaModal from '../components/CapturaPlanillaModal'

interface CuentaDigitador { id: string; nombre: string; email: string | null; cedula: string; activo: boolean }
const buttonCls = 'rounded-lg px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40'

async function cuentasRequest(path = '', options: RequestInit = {}) {
  const response = await fetch(`/api/digitadores${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}`, ...options.headers },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.')
  return data
}

export default function Digitador() {
  const { session, simpatizantesApi, cargandoSimpatizantes, cargarSimpatizantesApi, lideresApi, usuariosApi, openPersona, notify } = useApp()
  const [cuentas, setCuentas] = useState<CuentaDigitador[]>([])
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [cedula, setCedula] = useState('')
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [liderId, setLiderId] = useState('')
  const [capturaOpen, setCapturaOpen] = useState(false)
  const esAdmin = session?.rol === 'admin'

  useEffect(() => {
    if (!esAdmin) return
    let cancelled = false
    cuentasRequest().then((data) => { if (!cancelled) setCuentas(data.items) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [esAdmin])

  function cerrarModal() {
    if (busy) return
    setModalOpen(false)
    setNombre(''); setEmail(''); setCedula('')
  }

  async function crearCuenta() {
    if (busy) return
    setBusy(true)
    try {
      const cuenta = await cuentasRequest('', { method: 'POST', body: JSON.stringify({ nombre, email, cedula }) })
      setCuentas((items) => [...items, cuenta])
      setModalOpen(false)
      setNombre(''); setEmail(''); setCedula('')
      setError('')
      notify('Digitador creado. Puede ingresar con su correo y su cédula como contraseña inicial.', 'success')
    } catch (err) { notify(err instanceof Error ? err.message : 'No se pudo crear la cuenta.', 'error') }
    finally { setBusy(false) }
  }

  async function cambiarEstado(cuenta: CuentaDigitador) {
    setBusy(true)
    try {
      await cuentasRequest(`/${cuenta.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !cuenta.activo }) })
      setCuentas((items) => items.map((item) => item.id === cuenta.id ? { ...item, activo: !item.activo } : item))
    } catch (err) { notify(err instanceof Error ? err.message : 'No se pudo actualizar la cuenta.', 'error') }
    finally { setBusy(false) }
  }

  const text = query.trim().toLowerCase()
  const personas = simpatizantesApi.filter((p) => (!liderId || p.liderId === liderId)
    && `${p.nombres} ${p.apellidos} ${p.cedula} ${p.numeroPlanilla ?? ''}`.toLowerCase().includes(text))

  return (
    <div className="space-y-4">
      {esAdmin && <Card title="Digitadores" action={<button type="button" className={buttonCls} onClick={() => setModalOpen(true)}>+ Nuevo digitador</button>}>
        <p className="text-sm text-slate-500 mb-3">Apoyo a todos los padrinos: registro y corrección de simpatizantes desde planillas.</p>
        {error && <p role="alert" className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-50"><tr>{['Nombre', 'Correo', 'Cédula', 'Estado', 'Acción'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead>
            <tbody>
              {!cuentas.length && <tr><td colSpan={5} className="p-4 text-slate-500">Sin digitadores registrados.</td></tr>}
              {cuentas.map((cuenta) => <tr key={cuenta.id} className="border-b border-slate-100">
                <td className="p-3">{cuenta.nombre}</td><td className="p-3">{cuenta.email}</td><td className="p-3">{cuenta.cedula}</td>
                <td className="p-3"><Badge className={cuenta.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>{cuenta.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="p-3"><button disabled={busy} type="button" onClick={() => void cambiarEstado(cuenta)} className="text-blue-600 disabled:opacity-40">{cuenta.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </Card>}
      <Card title={session?.rol === 'lider' ? 'Mis simpatizantes' : 'Digitación de planillas'} action={<button type="button" className={buttonCls} onClick={() => session?.rol === 'lider' ? openPersona({ mode: 'new' }) : setCapturaOpen(true)}>+ {session?.rol === 'lider' ? 'Registrar simpatizante' : 'Capturar fila'}</button>}>
        <p className="text-sm text-slate-500 mb-3">{session?.rol === 'lider' ? 'Registra o completa las fichas de tus simpatizantes. Tu padrino podrá consultar los datos.' : 'Transcribe los datos de la planilla y asócialos con el líder correspondiente. El padrino se asigna automáticamente.'}</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <label className="text-sm">Buscar por nombre, cédula o número<input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          <label className="text-sm">Líder<select className={inputCls} value={liderId} onChange={(e) => setLiderId(e.target.value)}><option value="">Todos los líderes</option>{lideresApi.map((l) => <option key={l.id} value={l.id}>{l.nombres} {l.apellidos}</option>)}</select></label>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1500px] text-left text-sm">
          <thead className="bg-slate-50"><tr>{['No.', 'Nombre y apellidos', 'Cédula', 'Celular', 'Dirección', 'Barrio', 'Lugar de votación', 'Mesa', 'Vehículo', 'Líder / padrino', 'Registrado por', 'Acción'].map((label) => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>
            {!personas.length && <tr><td colSpan={12} className="p-4 text-slate-500">{cargandoSimpatizantes ? 'Cargando…' : 'Sin registros para los filtros aplicados.'}</td></tr>}
            {personas.map((p) => {
              const lider = lideresApi.find((l) => l.id === p.liderId)
              const padrino = usuariosApi.find((u) => u.id === lider?.padrinoId)
              return <tr key={p.id} className="border-b border-slate-100">
                <td className="p-3">{p.numeroPlanilla ?? '—'}</td>
                <td className="p-3 whitespace-nowrap">{p.nombreCompletoOriginal || `${p.nombres} ${p.apellidos}`}</td>
                <td className="p-3">{p.cedula}</td>
                <td className="p-3 whitespace-nowrap">{p.telefono}</td>
                <td className="p-3 min-w-48">{p.direccion || '—'}</td>
                <td className="p-3">{p.barrio}</td>
                <td className="p-3 min-w-48">{p.puesto}</td>
                <td className="p-3">{p.mesa}</td>
                <td className="p-3">{p.tieneVehiculo === null || p.tieneVehiculo === undefined ? '—' : p.tieneVehiculo ? p.tipoVehiculoPlanilla : 'No'}</td>
                <td className="p-3 whitespace-nowrap"><span className="block">{lider ? `${lider.nombres} ${lider.apellidos}` : p.trazabilidad?.lider.nombre || '—'}</span><span className="text-xs text-slate-500">{padrino?.nombre || p.trazabilidad?.padrino.nombre || '—'}</span></td>
                <td className="p-3">
                  <span className="block">{p.trazabilidad?.registradoPor.nombre || usuariosApi.find((u) => u.id === p.creadoPor)?.nombre || 'Sin nombre disponible'}</span>
                  {p.trazabilidad && <span className="block text-xs text-slate-500 mt-1">Origen: {p.trazabilidad.lider.nombre} · {p.trazabilidad.padrino.nombre}</span>}
                </td>
                <td className="p-3"><button type="button" className="text-blue-600" onClick={() => openPersona({ mode: 'edit', personaId: p.id })}>Editar</button></td>
              </tr>
            })}
          </tbody>
        </table></div>
      </Card>
      <CapturaPlanillaModal open={capturaOpen} lideres={lideresApi} usuarios={usuariosApi} onClose={() => setCapturaOpen(false)} onSaved={cargarSimpatizantesApi} notify={notify} />
      <Modal open={modalOpen} onClose={cerrarModal} title="Nuevo digitador" footer={<>
        <button type="button" onClick={cerrarModal} disabled={busy} className="px-4 py-2 text-sm">Cancelar</button>
        <button type="submit" form="nuevo-digitador" disabled={busy || !nombre.trim() || !email.trim() || !/^[0-9]{6,10}$/.test(cedula)} className={buttonCls}>{busy ? 'Creando…' : 'Crear digitador'}</button>
      </>}>
        <p className="text-sm text-slate-500 mb-3">La contraseña inicial será la cédula. Tendrá acceso a la digitación para todos los líderes.</p>
        <form id="nuevo-digitador" onSubmit={(e) => { e.preventDefault(); void crearCuenta() }} className="space-y-3">
          <label className="block text-sm">Nombre completo<input autoFocus required maxLength={100} disabled={busy} className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
          <label className="block text-sm">Correo electrónico<input type="email" required maxLength={254} disabled={busy} className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm">Cédula<input required pattern="[0-9]{6,10}" maxLength={10} inputMode="numeric" disabled={busy} className={inputCls} value={cedula} onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} /></label>
        </form>
      </Modal>
    </div>
  )
}
