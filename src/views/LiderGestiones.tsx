import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useApp } from '../store'
import { getPersona } from '../data'
import { fmtCOP, fmtFecha } from '../lib'
import { Badge, estadoTone } from '../components/ui'

export default function LiderGestiones() {
  const { db, session, openGestion } = useApp()

  const lista = useMemo(
    () =>
      db.gestiones
        .filter((g) => getPersona(db, g.personaId)?.liderId === session?.liderId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [db, session],
  )

  const totalInv = lista.reduce((s, g) => s + (Number(g.monto) || 0), 0)

  return (
    <div>
      <div className="flex items-center mb-4 gap-3">
        <p className="text-sm text-slate-500">
          Total gestionado en tu zona: <b className="text-amber-700">{fmtCOP(totalInv)}</b>
        </p>
        <button onClick={() => openGestion({ mode: 'new' })} className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Registrar gestión
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50">
              <tr>
                {['Fecha', 'Persona', 'Categoría', 'Descripción', 'Monto', 'Estado', ''].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-slate-400 text-sm">
                    Sin gestiones registradas.
                  </td>
                </tr>
              )}
              {lista.map((g) => {
                const p = getPersona(db, g.personaId)
                return (
                  <tr key={g.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-3 py-2.5 text-sm">{fmtFecha(g.fecha)}</td>
                    <td className="px-3 py-2.5 text-sm font-medium">{p ? `${p.nombres} ${p.apellidos}` : '?'}</td>
                    <td className="px-3 py-2.5">
                      <Badge className="bg-slate-100 text-slate-700">{g.categoria}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-xs">{g.descripcion}</td>
                    <td className={`px-3 py-2.5 font-semibold ${g.monto > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                      {g.monto > 0 ? fmtCOP(g.monto) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={estadoTone(g.estado)}>{g.estado}</Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => openGestion({ mode: 'edit', gestionId: g.id })} className="text-xs text-blue-600 hover:underline">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
