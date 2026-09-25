import { useMemo } from 'react'
import { CheckCircle2, ClipboardList, FileWarning, Users } from 'lucide-react'
import { useApp } from '../../../store'
import { camposFaltantes, lideresDePadrino } from '../../../data'
import { Badge, Card, Kpi } from '../../../components/ui'

export default function PadrinoDash() {
  const { db, session } = useApp()
  const pid = session?.padrinoId ?? ''
  const padrino = db.padrinos.find((p) => p.id === pid)
  const lideres = useMemo(() => lideresDePadrino(db, pid), [db, pid])
  const ids = useMemo(() => new Set(lideres.map((l) => l.id)), [lideres])

  const planillas = db.planillas.filter((pl) => pl.padrinoId === pid)
  const fichas = db.personas.filter((p) => ids.has(p.liderId ?? ''))
  const incompletas = fichas.filter((p) => camposFaltantes(p).length > 0)

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-800 to-indigo-600 rounded-2xl p-5 mb-4 text-white">
        <h2 className="text-xl font-extrabold">🛡️ Mesa de Datos</h2>
        <p className="text-indigo-100 text-sm">
          {padrino?.nombre} · {padrino?.sector} · {lideres.length} líderes apadrinados
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi icon={Users} label="Líderes apadrinados" value={lideres.length} accent="text-indigo-600" />
        <Kpi icon={ClipboardList} label="Planillas" value={planillas.length} accent="text-blue-600" />
        <Kpi icon={CheckCircle2} label="Fichas de mis líderes" value={fichas.length} accent="text-emerald-600" />
        <Kpi icon={FileWarning} label="Fichas incompletas" value={incompletas.length} accent="text-amber-600" />
      </div>

      <Card title="🎯 Seguimiento de mis líderes">
        <p className="text-xs text-slate-500 mb-3">
          Completitud de la data de cada líder apadrinado. «Incompletas» = fichas con teléfono/correo/dirección/barrio faltante.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead className="bg-slate-50">
              <tr>
                {['Líder', 'Territorio', 'Meta', 'Fichas', 'Incompletas', 'Planillas', 'Estado'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 px-3 py-2.5 border-b border-slate-200 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lideres.map((l) => {
                const f = db.personas.filter((p) => p.liderId === l.id)
                const inc = f.filter((p) => camposFaltantes(p).length > 0).length
                const pls = db.planillas.filter((pl) => pl.liderId === l.id)
                return (
                  <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-sm font-semibold text-slate-800">{l.nombres} {l.apellidos}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[200px] truncate" title={l.territorio}>{l.territorio}</td>
                    <td className="px-3 py-2.5 text-sm">{l.meta}</td>
                    <td className="px-3 py-2.5 text-sm">{f.length}</td>
                    <td className="px-3 py-2.5">
                      {inc > 0 ? (
                        <Badge className="bg-amber-100 text-amber-700">{inc}</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700">0</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-sm">{pls.length}</td>
                    <td className="px-3 py-2.5">
                      <Badge className={inc > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                        {inc > 0 ? '🟡 Por completar' : '🟢 Al día'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
