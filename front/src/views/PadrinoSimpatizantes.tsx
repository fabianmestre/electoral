import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useApp } from '../store'
import { Badge, nivelTone } from '../components/ui'

export default function PadrinoSimpatizantes() {
  const { simpatizantesApi, lideresApi, session, openPersona } = useApp()
  const [q, setQ] = useState('')
  const pid = session?.id ?? ''

  const lideres = useMemo(() => lideresApi.filter((l) => l.padrinoId === pid), [lideresApi, pid])
  const ids = useMemo(() => new Set(lideres.map((l) => l.id)), [lideres])

  const personas = useMemo(() => {
    let l = simpatizantesApi.filter((p) => p.liderId && ids.has(p.liderId))
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      l = l.filter((p) => `${p.nombres} ${p.apellidos} ${p.cedula} ${p.barrio} ${p.telefono}`.toLowerCase().includes(s))
    }
    return l.sort((a, b) => a.nombres.localeCompare(b.nombres))
  }, [simpatizantesApi, ids, q])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, cédula, barrio, teléfono..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Persona', 'Cédula', 'Líder', 'Barrio', 'Nivel', 'Planilla', 'Teléfono', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-slate-400 text-sm text-center">Sin simpatizantes para los filtros aplicados.</td>
                </tr>
              )}
              {personas.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-sm">
                    <button onClick={() => openPersona({ mode: 'edit', personaId: p.id })} className="text-left font-medium text-blue-600 hover:underline">
                      {p.nombres} {p.apellidos}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600 text-sm">{p.cedula}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-600">{lideres.find((l) => l.id === p.liderId)?.nombres || '—'}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-600">{p.barrio}</td>
                  <td className="px-3 py-2.5">
                    <Badge className={nivelTone(p.nivelVoto)}>{p.nivelVoto}</Badge>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.planillaCodigo ?? '—'}</td>
                  <td className="px-3 py-2.5 text-sm">
                    {p.telefono ? (
                      <span className="text-slate-600">{p.telefono}</span>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700">Sin teléfono</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => openPersona({ mode: 'edit', personaId: p.id })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" /> Completar ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
