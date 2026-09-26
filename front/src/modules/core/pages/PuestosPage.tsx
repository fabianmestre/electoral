import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useApp } from '../../../store'
import { Modal } from '../../../components/ui'
import { recargarPuestos, useCatalogos, type PuestoVotacion } from '../../../catalogos'

type Borrador = Omit<PuestoVotacion, 'comuna' | 'corregimiento' | 'barrio' | 'direccion'> & { sector: string; barrio: string; direccion: string }
const VACIO: Borrador = { codigo: '', nombre: '', departamento: 'Cesar', municipio: 'Valledupar', zona: 'Urbana', sector: '', barrio: '', direccion: '', mesas: 1, activo: true }
const inputCls = 'mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500'

async function api<T>(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const response = await fetch(`/api/puestos${path}`, {
    method, body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('electoral.auth.token')}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.fields ? Object.values(data.fields).join(' ') : data.error || 'No se pudo guardar el puesto.')
  return data
}

export default function PuestosPage() {
  const { notify, simpatizantesApi } = useApp()
  const cat = useCatalogos()
  const [q, setQ] = useState('')
  const [municipio, setMunicipio] = useState('all')
  const [estado, setEstado] = useState('activos')
  const [editando, setEditando] = useState<{ nuevo: boolean; datos: Borrador } | null>(null)
  const [guardando, setGuardando] = useState(false)

  const asignados = useMemo(() => {
    const n = new globalThis.Map<string, number>()
    for (const p of simpatizantesApi) if (p.puesto) n.set(p.puesto.toUpperCase().replace(/[^A-Z0-9]/g, ''), (n.get(p.puesto.toUpperCase().replace(/[^A-Z0-9]/g, '')) ?? 0) + 1)
    return n
  }, [simpatizantesApi])
  const municipios = [...new Set(cat.puestos.map((p) => `${p.municipio} (${p.departamento})`))].sort()
  const filtrados = cat.puestos.filter((p) =>
    (estado === 'todos' || (estado === 'activos') === p.activo)
    && (municipio === 'all' || `${p.municipio} (${p.departamento})` === municipio)
    && (!q.trim() || `${p.codigo} ${p.nombre} ${p.barrio ?? ''} ${p.comuna ?? ''} ${p.corregimiento ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())))

  const abrirNuevo = () => {
    const usados = cat.puestos.map((p) => Number(/^PV(\d+)$/.exec(p.codigo)?.[1] ?? 0))
    setEditando({ nuevo: true, datos: { ...VACIO, codigo: `PV${String(Math.max(0, ...usados) + 1).padStart(2, '0')}` } })
  }
  const abrir = (p: PuestoVotacion) => setEditando({ nuevo: false, datos: { ...p, sector: (p.zona === 'Rural' ? p.corregimiento : p.comuna) ?? '', barrio: p.barrio ?? '', direccion: p.direccion ?? '' } })
  const patch = (x: Partial<Borrador>) => setEditando((e) => (e ? { ...e, datos: { ...e.datos, ...x } } : e))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editando) return
    const d = editando.datos
    const cuerpo = {
      nombre: d.nombre, departamento: d.departamento, municipio: d.municipio, zona: d.zona,
      comuna: d.zona === 'Urbana' ? d.sector : null, corregimiento: d.zona === 'Rural' ? d.sector : null,
      barrio: d.barrio, direccion: d.direccion, mesas: Number(d.mesas), activo: d.activo,
    }
    setGuardando(true)
    try {
      if (editando.nuevo) await api('', 'POST', { ...cuerpo, codigo: d.codigo })
      else await api(`/${encodeURIComponent(d.codigo)}`, 'PATCH', cuerpo)
      await recargarPuestos()
      notify(editando.nuevo ? `Puesto ${d.codigo} creado` : `Puesto ${d.codigo} actualizado`, 'success')
      setEditando(null)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'No se pudo guardar el puesto.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  const deptos = cat.departamentos.length ? cat.departamentos : ['Cesar']
  const munics = (dep: string) => (cat.departamentos.length ? cat.municipiosDe(dep) : ['Valledupar'])
  const d = editando?.datos

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div>
        <div className="mb-6"><h1 className="text-xl font-semibold text-gray-900">Puestos de Votación</h1><p className="text-sm text-gray-500">Catálogo de puestos y número de mesas. Es la lista que aparece en la ficha de cada simpatizante.</p></div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nombre o barrio..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></div>
          <select value={municipio} onChange={(e) => setMunicipio(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="all">Todos los municipios</option>{municipios.map((m) => <option key={m}>{m}</option>)}</select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="todos">Todos</option></select>
          <button type="button" onClick={abrirNuevo} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Nuevo puesto</button>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>{['Código', 'Puesto', 'Departamento', 'Municipio', 'Zona', 'Comuna/Correg.', 'Barrio', 'Mesas', 'Simpatizantes', 'Estado', ''].map((h) => <th key={h} className="whitespace-nowrap px-4 py-2.5 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length === 0 && <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-gray-400">{cat.cargado ? 'Sin puestos para los filtros aplicados.' : 'Cargando puestos…'}</td></tr>}
            {filtrados.map((p) => (
              <tr key={p.codigo} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-gray-600">{p.codigo}</td>
                <td className="px-4 py-2.5 font-medium text-gray-900">{p.nombre}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.departamento}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.municipio}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.zona}</td>
                <td className="px-4 py-2.5 text-gray-600">{(p.zona === 'Rural' ? p.corregimiento : p.comuna) || '—'}</td>
                <td className="px-4 py-2.5 text-gray-600">{p.barrio || '—'}</td>
                <td className="px-4 py-2.5 text-gray-900">{p.mesas}</td>
                <td className="px-4 py-2.5 text-gray-600">{asignados.get(p.codigo) ?? 0}</td>
                <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td className="px-4 py-2.5 text-right"><button type="button" onClick={() => abrir(p)} className="text-xs font-medium text-blue-600 hover:underline">Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table></div></div>
      </div>

      <Modal open={!!editando} onClose={() => !guardando && setEditando(null)} title={editando?.nuevo ? 'Nuevo puesto de votación' : `Editar ${d?.codigo ?? ''}`}
        footer={<><button type="button" onClick={() => setEditando(null)} disabled={guardando} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button><button type="submit" form="form-puesto" disabled={guardando} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button></>}>
        {d && <form id="form-puesto" onSubmit={guardar} className="grid grid-cols-2 gap-3 text-xs font-medium text-gray-600">
          <label>Código <span className="text-red-500">*</span><input id="p-codigo" required disabled={!editando?.nuevo} value={d.codigo} onChange={(e) => patch({ codigo: e.target.value.toUpperCase() })} className={inputCls} /></label>
          <label>Mesas <span className="text-red-500">*</span><input id="p-mesas" required type="number" min={1} max={1000} value={d.mesas} onChange={(e) => patch({ mesas: Number(e.target.value) })} className={inputCls} /></label>
          <label className="col-span-2">Nombre del puesto <span className="text-red-500">*</span><input id="p-nombre" required value={d.nombre} onChange={(e) => patch({ nombre: e.target.value })} placeholder="Ej: I.E. Loperena" className={inputCls} /></label>
          <label>Departamento <span className="text-red-500">*</span><select id="p-depto" required value={d.departamento} onChange={(e) => patch({ departamento: e.target.value, municipio: '' })} className={inputCls}><option value="">Seleccionar</option>{deptos.map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Municipio <span className="text-red-500">*</span><select id="p-muni" required value={d.municipio} onChange={(e) => patch({ municipio: e.target.value })} className={inputCls}><option value="">Seleccionar</option>{munics(d.departamento).map((x) => <option key={x}>{x}</option>)}</select></label>
          <label>Zona<select id="p-zona" value={d.zona} onChange={(e) => patch({ zona: e.target.value as 'Urbana' | 'Rural' })} className={inputCls}><option>Urbana</option><option>Rural</option></select></label>
          <label>{d.zona === 'Rural' ? 'Corregimiento' : 'Comuna'}<input id="p-sector" value={d.sector} onChange={(e) => patch({ sector: e.target.value })} className={inputCls} /></label>
          <label>Barrio<input id="p-barrio" value={d.barrio} onChange={(e) => patch({ barrio: e.target.value })} className={inputCls} /></label>
          <label>Dirección<input id="p-dir" value={d.direccion} onChange={(e) => patch({ direccion: e.target.value })} className={inputCls} /></label>
          <label className="col-span-2 flex items-center gap-2 text-sm font-normal text-gray-700"><input id="p-activo" type="checkbox" checked={d.activo} onChange={(e) => patch({ activo: e.target.checked })} />Puesto activo (aparece en la ficha del simpatizante)</label>
        </form>}
      </Modal>
    </main>
  )
}
