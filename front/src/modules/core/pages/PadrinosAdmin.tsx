import { Copy, Eye, EyeOff, KeyRound, Search } from 'lucide-react'
import { confirmar } from '../../../components/ConfirmDialog'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../../store'

interface Cuenta { id: string; nombre: string; cedula: string | null; rol: 'lider' | 'gestor' | 'digitador'; activo: boolean; creadoEn: string; email: string | null }

const ROL: Record<Cuenta['rol'], [string, string]> = {
  lider: ['Líder', 'bg-blue-50 text-blue-700'],
  gestor: ['Gestor', 'bg-amber-50 text-amber-700'],
  digitador: ['Digitador', 'bg-teal-50 text-teal-700'],
}

async function api<T>(path = '', options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/credenciales${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}`, ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.')
  return data
}

export default function PadrinosAdmin() {
  const { notify } = useApp()
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [cargando, setCargando] = useState(true)
  const [q, setQ] = useState('')
  const [rol, setRol] = useState('all')
  const [estado, setEstado] = useState('all')
  // Las contraseñas se guardan cifradas: solo se puede ver la clave temporal recién generada.
  const [claves, setClaves] = useState<Record<string, string>>({})
  const [show, setShow] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api<{ items: Cuenta[] }>().then((d) => setCuentas(d.items))
      .catch((e) => notify(e instanceof Error ? e.message : 'No se pudieron cargar las cuentas.', 'error'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return cuentas.filter((c) => (rol === 'all' || c.rol === rol)
      && (estado === 'all' || (estado === 'activo') === c.activo)
      && (!t || `${c.nombre} ${c.email ?? ''} ${c.cedula ?? ''}`.toLowerCase().includes(t)))
  }, [cuentas, q, rol, estado])
  const activas = cuentas.filter((c) => c.activo).length

  const restablecer = async (c: Cuenta) => {
    if (!(await confirmar({ titulo: 'Restablecer clave', mensaje: `Se generará una clave nueva para ${c.nombre}. La clave actual dejará de funcionar.`, confirmar: 'Generar clave', icono: 'clave' }))) return
    setBusy(c.id)
    try {
      const { password } = await api<{ password: string }>(`/${c.id}/clave`, { method: 'POST' })
      setClaves((x) => ({ ...x, [c.id]: password }))
      setShow(c.id)
      notify('Clave restablecida. Cópiala y entrégasela: solo se muestra ahora.', 'success')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo restablecer la clave.', 'error') }
    finally { setBusy(null) }
  }

  const cambiarAcceso = async (c: Cuenta) => {
    if (c.activo && !(await confirmar({ titulo: 'Desactivar acceso', mensaje: `${c.nombre} no podrá iniciar sesión hasta que reactives su cuenta. No se borra ningún dato.`, confirmar: 'Desactivar', tono: 'peligro' }))) return
    setBusy(c.id)
    try {
      await api(`/${c.id}`, { method: 'PATCH', body: JSON.stringify({ activo: !c.activo }) })
      setCuentas((xs) => xs.map((x) => (x.id === c.id ? { ...x, activo: !x.activo } : x)))
      notify(c.activo ? 'Acceso desactivado' : 'Acceso reactivado', 'success')
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo actualizar la cuenta.', 'error') }
    finally { setBusy(null) }
  }

  const copiar = (clave: string) => { void navigator.clipboard?.writeText(clave); notify('Clave copiada', 'success') }

  return <main className="flex-1 overflow-y-auto p-6"><div>
    <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Credenciales de Acceso</h1><p className="text-sm text-gray-500">Cuentas de Líderes, Gestores y Digitadores — se crean automáticamente al promover a alguien desde Roles. El Padrino no inicia sesión en la plataforma, por eso no aparece aquí.</p></div>
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">{([['Cuentas totales', cuentas.length, 'text-gray-900', 'all'], ['Con acceso activo', activas, 'text-emerald-600', 'activo'], ['Acceso desactivado', cuentas.length - activas, 'text-amber-600', 'inactivo']] as const).map(([t, v, c, e]) => <div key={t} onClick={() => setEstado(e)} className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:border-blue-300 ${estado === e ? 'border-blue-300' : 'border-gray-200'}`}><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t}</p><p className={`mt-2 text-2xl font-semibold ${c}`}>{cargando ? '…' : v}</p></div>)}</div>
    <div className="mb-4 flex flex-wrap items-center gap-2"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o usuario..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm" /></div><select value={rol} onChange={(e) => setRol(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="all">Todo rol</option><option value="lider">Líder</option><option value="gestor">Gestor</option><option value="digitador">Digitador</option></select><select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="all">Todo estado</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-500"><tr>{['Nombre', 'Usuario', 'Rol', 'Contraseña', 'Estado', 'Creada', ''].map((h) => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">
      {filtradas.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">{cargando ? 'Cargando cuentas…' : 'Sin cuentas para los filtros aplicados.'}</td></tr>}
      {filtradas.map((c) => {
        // Clave generada en esta sesión, o la inicial (cédula) con la que se creó la cuenta.
        const clave = claves[c.id] ?? c.cedula ?? ''
        const inicial = !claves[c.id]
        const visible = show === c.id && !!clave
        return <tr key={c.id} className="hover:bg-gray-50">
          <td className="whitespace-nowrap px-4 py-2.5 font-medium text-gray-900">{c.nombre}</td>
          <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{c.email ?? '—'}</td>
          <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROL[c.rol][1]}`}>{ROL[c.rol][0]}</span></td>
          <td className="px-4 py-2.5"><div className="flex items-center gap-2 font-mono text-xs text-gray-600">
            <span>{visible ? clave : '•••••••••••••••'}</span>
            {visible && inicial && <span className="rounded bg-gray-100 px-1.5 py-0.5 font-sans text-[10px] text-gray-500" title="Clave con la que se creó la cuenta. Si la persona la cambió, ya no es válida: usa «Restablecer clave».">inicial</span>}
            <button type="button" onClick={() => clave ? setShow(show === c.id ? null : c.id) : notify('Esta cuenta no tiene cédula registrada. Usa «Restablecer clave» para generar una.', 'info')} className="text-gray-400 hover:text-gray-600" title={inicial ? 'Mostrar clave inicial (cédula)' : 'Mostrar clave temporal'}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            {visible
              ? <button type="button" onClick={() => copiar(clave)} className="text-gray-400 hover:text-gray-600" title="Copiar clave"><Copy className="h-4 w-4" /></button>
              : <button type="button" disabled={busy === c.id} onClick={() => void restablecer(c)} className="text-gray-400 hover:text-gray-600 disabled:opacity-40" title="Restablecer"><KeyRound className="h-4 w-4" /></button>}
          </div></td>
          <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td className="whitespace-nowrap px-4 py-2.5 text-gray-500">{c.creadoEn?.slice(0, 10)}</td>
          <td className="whitespace-nowrap px-4 py-2.5 text-right">
            <button disabled={busy === c.id} onClick={() => void restablecer(c)} className="mr-3 text-xs font-medium text-blue-600 hover:underline disabled:opacity-40">Restablecer clave</button>
            <button disabled={busy === c.id} onClick={() => void cambiarAcceso(c)} className={`text-xs font-medium hover:underline disabled:opacity-40 ${c.activo ? 'text-red-600' : 'text-emerald-600'}`}>{c.activo ? 'Desactivar' : 'Activar'}</button>
          </td>
        </tr>
      })}
    </tbody></table></div></div>
  </div></main>
}
