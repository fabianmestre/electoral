import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useApp } from '../store'
import { Badge, nivelTone } from '../components/ui'

export default function LiderSimpatizantes() {
  const { db, session, openPersona, verPerfil, registrarVoto } = useApp()
  const [q, setQ] = useState('')

  const lista = useMemo(() => {
    let l = db.personas.filter((p) => p.liderId === session?.liderId)
    if (q.trim()) l = l.filter((p) => `${p.nombres} ${p.apellidos} ${p.cedula} ${p.barrio}`.toLowerCase().includes(q.trim().toLowerCase()))
    return l.sort((a, b) => a.nombres.localeCompare(b.nombres))
  }, [db, session, q])

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button onClick={() => openPersona({ mode: 'new' })} className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Capturar simpatizante
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lista.length === 0 && <p className="text-sm text-slate-400 col-span-full">Sin simpatizantes registrados aún.</p>}
        {lista.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition"
          >
            <button onClick={() => verPerfil(p.id)} className="w-full text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {p.nombres[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">
                    {p.nombres} {p.apellidos}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    CC {p.cedula} · {p.barrio}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className={nivelTone(p.nivelVoto)}>{p.nivelVoto}</Badge>
                <Badge className={p.vehiculos.length === 0 ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-700'}>
                  {p.vehiculos.length === 0 ? 'Sin vehículo' : `${p.vehiculos.length} veh · ${p.vehiculos.filter((v) => v.aDisposicion).length} disp.`}
                </Badge>
              </div>
            </button>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
              <Badge className={p.votoRegistrado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                {p.votoRegistrado ? `✅ Votó · ${p.votoHora}` : '⏳ Sin voto'}
              </Badge>
              {!p.votoRegistrado && (
                <button
                  onClick={() => registrarVoto(p.id)}
                  className="text-xs bg-emerald-600 text-white rounded-lg px-2.5 py-1.5 font-semibold hover:bg-emerald-700"
                >
                  ✓ Registrar voto
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
