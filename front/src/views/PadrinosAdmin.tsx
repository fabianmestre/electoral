import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { Badge, Card, Modal } from '../components/ui'
import type { PadrinoApi } from '../types'

const inputCls2 = 'border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500'

interface Credenciales {
  nombre: string
  email: string
  password: string
}

export default function PadrinosAdmin() {
  const { padrinosApi, cargandoPadrinos, cargarPadrinosApi, crearPadrinoApi, editarPadrinoApi, resetClavePadrinoApi, lideresApi } = useApp()

  const [staffNombre, setStaffNombre] = useState('')
  const [staffCedula, setStaffCedula] = useState('')
  const [staffSector, setStaffSector] = useState('')
  const [creando, setCreando] = useState(false)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [credenciales, setCredenciales] = useState<Credenciales | null>(null)
  const [ocupadoId, setOcupadoId] = useState<string | null>(null)

  useEffect(() => {
    void cargarPadrinosApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agregarStaff = async () => {
    if (!staffNombre.trim() || creando) return
    setCreando(true)
    const res = await crearPadrinoApi({
      nombre: staffNombre.trim(),
      cedula: staffCedula.trim() || undefined,
      sector: staffSector.trim() || undefined,
    })
    setCreando(false)
    if (res) {
      setCredenciales({ nombre: staffNombre.trim(), email: res.email, password: res.password })
      setStaffNombre('')
      setStaffCedula('')
      setStaffSector('')
      setNuevoOpen(false)
    }
  }

  const cerrarNuevo = () => {
    if (creando) return
    setNuevoOpen(false)
    setStaffNombre('')
    setStaffCedula('')
    setStaffSector('')
  }

  const resetClave = async (p: PadrinoApi) => {
    if (!window.confirm(`¿Restablecer la contraseña de ${p.nombre}? La contraseña anterior dejará de funcionar.`)) return
    setOcupadoId(p.id)
    const password = await resetClavePadrinoApi(p.id)
    setOcupadoId(null)
    if (password) setCredenciales({ nombre: p.nombre, email: p.email ?? '—', password })
  }

  const toggleActivo = async (p: PadrinoApi) => {
    if (p.activo && !window.confirm(`¿Quitar el rol de padrino a ${p.nombre}? No podrá iniciar sesión hasta que lo reactives.`)) return
    setOcupadoId(p.id)
    await editarPadrinoApi(p.id, { activo: !p.activo })
    setOcupadoId(null)
  }

  return (
    <div>
      {credenciales && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Credenciales de {credenciales.nombre}</p>
              <p className="text-xs text-emerald-700 mt-1">Guárdalas ahora: la contraseña no se volverá a mostrar.</p>
              <div className="mt-2 font-mono text-sm text-emerald-900 space-y-0.5">
                <div>Correo: {credenciales.email}</div>
                <div>Contraseña: {credenciales.password}</div>
              </div>
            </div>
            <button onClick={() => setCredenciales(null)} className="text-xs font-semibold text-emerald-700 hover:underline shrink-0">
              Cerrar
            </button>
          </div>
        </div>
      )}

      <Card title="🛡️ Padrinos de la mesa de datos" action={
        <button type="button" onClick={() => setNuevoOpen(true)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
          + Nuevo padrino
        </button>
      }>
        <p className="text-xs text-slate-500 mb-3">
          Un padrino es personal de campaña: no necesita votar en Valledupar. Cada líder se asigna a un padrino desde el módulo Líderes.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Padrino', 'Cédula', 'Sector', 'Estado', 'Líderes apadrinados', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {padrinosApi.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-slate-400 text-sm text-center">
                    {cargandoPadrinos ? 'Cargando padrinos…' : 'Sin padrinos registrados todavía.'}
                  </td>
                </tr>
              )}
              {padrinosApi.map((p) => {
                const lideres = lideresApi.filter((l) => l.padrinoId === p.id)
                return (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-semibold text-slate-800">{p.nombre}</div>
                      {p.email && <div className="font-mono text-[10px] text-slate-400">{p.email}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">{p.cedula || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{p.sector || '—'}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {lideres.length === 0 ? (
                          <span className="text-xs text-slate-400">Sin líderes</span>
                        ) : (
                          lideres.map((l) => (
                            <Badge key={l.id} className="bg-indigo-100 text-indigo-700">{l.nombres}</Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => void resetClave(p)}
                          disabled={ocupadoId === p.id}
                          className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Clave
                        </button>
                        <button
                          onClick={() => void toggleActivo(p)}
                          disabled={ocupadoId === p.id}
                          className={`text-xs font-semibold hover:underline whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${p.activo ? 'text-red-600' : 'text-emerald-600'}`}
                        >
                          {p.activo ? 'Quitar rol' : 'Reactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={nuevoOpen} onClose={cerrarNuevo} title="Nuevo padrino" footer={
        <>
          <button type="button" onClick={cerrarNuevo} disabled={creando} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">Cancelar</button>
          <button type="submit" form="nuevo-padrino" disabled={!staffNombre.trim() || creando} className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700">
            {creando ? 'Creando…' : 'Agregar padrino'}
          </button>
        </>
      }>
        <p className="text-xs text-slate-500 mb-2">
          Crea la cuenta de acceso (correo y contraseña se generan automáticamente y se muestran una sola vez).
        </p>
        <form id="nuevo-padrino" onSubmit={(event) => { event.preventDefault(); void agregarStaff() }} className="space-y-3">
          <label className="block text-sm text-slate-700">
            Nombre completo
            <input autoFocus required disabled={creando} value={staffNombre} onChange={(e) => setStaffNombre(e.target.value)} className={`${inputCls2} mt-1 w-full`} />
          </label>
          <label className="block text-sm text-slate-700">
            Cédula (opcional)
            <input disabled={creando} inputMode="numeric" value={staffCedula} onChange={(e) => setStaffCedula(e.target.value)} className={`${inputCls2} mt-1 w-full`} />
          </label>
          <label className="block text-sm text-slate-700">
            Sector / zona (opcional)
            <input disabled={creando} value={staffSector} onChange={(e) => setStaffSector(e.target.value)} className={`${inputCls2} mt-1 w-full`} />
          </label>
        </form>
      </Modal>
    </div>
  )
}
