import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../../store'
import { Modal } from '../../../components/ui'
import Directorio from '../../simpatizantes/pages/DirectorioPage'
import type { SimpatizanteApi } from '../../../types'

interface Asignacion { gestorId: string; nombre: string; cedula: string | null; activo: boolean; liderIds: string[] }

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/gestores${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}`, ...options.headers },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.')
  return data
}

export default function GestoresAdmin() {
  const { cargarSimpatizantesApi, cargarLideresApi, lideresApi, simpatizantesApi, notify } = useApp()
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([])
  const [editando, setEditando] = useState<{ gestor: Asignacion; ficha: SimpatizanteApi } | null>(null)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargarAsignaciones = () => api<{ items: Asignacion[] }>('/asignaciones').then((d) => setAsignaciones(d.items))
    .catch((e) => notify(e instanceof Error ? e.message : 'No se pudieron cargar las asignaciones.', 'error'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void cargarSimpatizantesApi(); void cargarLideresApi(); void cargarAsignaciones() }, [])

  // La ficha (simpatizantes) y la cuenta del gestor (users) se relacionan por cédula.
  const cuentaDe = (p: SimpatizanteApi) => asignaciones.find((a) => a.cedula === p.cedula)
  const lideres = useMemo(() => {
    const t = q.trim().toLowerCase()
    return lideresApi.filter((l) => l.activo && (!t || `${l.nombres} ${l.apellidos} ${l.cedula}`.toLowerCase().includes(t)))
      .sort((a, b) => a.nombres.localeCompare(b.nombres))
  }, [lideresApi, q])
  const equipo = (liderId: string) => simpatizantesApi.filter((s) => s.liderId === liderId && (s.rol ?? 'simpatizante') === 'simpatizante').length

  const abrir = (ficha: SimpatizanteApi) => {
    const gestor = cuentaDe(ficha)
    if (!gestor) { notify('Este gestor aún no tiene cuenta de acceso. Vuelve a promoverlo o créala desde Credenciales.', 'warn'); return }
    setSeleccion(new Set(gestor.liderIds)); setQ(''); setEditando({ gestor, ficha })
  }
  const alternar = (id: string) => setSeleccion((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const guardar = async () => {
    if (!editando) return
    setGuardando(true)
    try {
      await api(`/${editando.gestor.gestorId}/lideres`, { method: 'PUT', body: JSON.stringify({ liderIds: [...seleccion] }) })
      await cargarAsignaciones()
      notify(`Líderes asignados a ${editando.ficha.nombres} ${editando.ficha.apellidos}: ${seleccion.size}`, 'success')
      setEditando(null)
    } catch (e) { notify(e instanceof Error ? e.message : 'No se pudo guardar la asignación.', 'error') }
    finally { setGuardando(false) }
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Gestor</h1>
        <p className="mb-1 text-sm text-gray-500">Gestiona quién tiene el rol de Gestor. Un gestor no digita fichas nuevas: mejora la caracterización de los simpatizantes de los líderes que tiene a cargo (perfil, ocupación, intereses, puesto/mesa de votación) para apoyar la toma de decisiones de la campaña. No puede eliminar registros ni editar datos básicos de identidad.</p>
        <Directorio
          rolMode="gestor"
          accionExtra={(p) => p.rol === 'gestor' && (
            <button type="button" onClick={() => abrir(p)} className="mr-3 text-xs font-medium text-blue-600 hover:underline">
              Asignar líderes ({cuentaDe(p)?.liderIds.length ?? 0})
            </button>
          )}
        />
      </div>

      <Modal
        open={!!editando}
        onClose={() => !guardando && setEditando(null)}
        title="Asignar líderes"
        subtitle={editando ? `${editando.ficha.nombres} ${editando.ficha.apellidos} solo verá y completará las fichas de los líderes que marques.` : ''}
        footer={<>
          <button type="button" onClick={() => setEditando(null)} disabled={guardando} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={() => void guardar()} disabled={guardando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{guardando ? 'Guardando…' : `Guardar (${seleccion.size})`}</button>
        </>}
      >
        <div className="relative mb-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar líder por nombre o cédula…" className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>{seleccion.size} de {lideresApi.filter((l) => l.activo).length} líderes marcados</span>
          <span className="space-x-3"><button type="button" onClick={() => setSeleccion(new Set([...seleccion, ...lideres.map((l) => l.id)]))} className="text-blue-600 hover:underline">Marcar visibles</button><button type="button" onClick={() => setSeleccion(new Set())} className="text-gray-500 hover:underline">Ninguno</button></span>
        </div>
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {lideres.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-400">Sin líderes para la búsqueda.</li>}
          {lideres.map((l) => (
            <li key={l.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50">
                <input type="checkbox" checked={seleccion.has(l.id)} onChange={() => alternar(l.id)} className="h-4 w-4 rounded border-gray-300" />
                <span className="flex-1 font-medium text-gray-800">{l.nombres} {l.apellidos}</span>
                <span className="text-xs text-gray-400">{equipo(l.id)} simpatizante(s)</span>
              </label>
            </li>
          ))}
        </ul>
      </Modal>
    </main>
  )
}
